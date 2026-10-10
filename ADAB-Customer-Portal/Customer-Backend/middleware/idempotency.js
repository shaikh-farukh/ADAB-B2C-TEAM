const crypto = require('crypto');

/**
 * In-memory Idempotency Store
 * Key: idempotency key
 * Value: {
 *   fingerprint: string,
 *   state: 'PROCESSING' | 'RESOLVED',
 *   statusCode: number,
 *   headers: object,
 *   body: any,
 *   createdAt: number,
 *   expiresAt: number
 * }
 */
const idempotencyStore = new Map();

// Default TTL: 10 minutes (600,000 ms)
const DEFAULT_TTL_MS = 10 * 60 * 1000;

// Periodic cleanup of expired keys every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (record.expiresAt && record.expiresAt < now) {
      idempotencyStore.delete(key);
    }
  }
}, 2 * 60 * 1000).unref();

/**
 * Creates SHA-256 fingerprint of request method, path, and sanitized body
 */
function createRequestFingerprint(req) {
  const method = req.method || 'POST';
  const url = req.originalUrl || req.url || '';
  const body = req.body || {};

  // Clone and sanitize transient / random fields if any
  const normalizedBody = { ...body };
  delete normalizedBody._t;
  delete normalizedBody.timestamp;

  const serialized = `${method}:${url}:${JSON.stringify(normalizedBody)}`;
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Idempotency Middleware
 * Intercepts requests with `x-idempotency-key` header (or body fallback).
 * Prevents double-submissions, protects in-flight execution, and replays cached responses.
 *
 * @param {Object} options
 * @param {number} [options.ttlMs=600000] - Expiration window in milliseconds
 * @param {boolean} [options.required=false] - If true, rejects requests lacking idempotency key
 */
function idempotencyMiddleware(options = {}) {
  const ttlMs = options.ttlMs || DEFAULT_TTL_MS;
  const isRequired = Boolean(options.required);

  return function (req, res, next) {
    // 1. Extract idempotency key from headers or request body
    const rawKey =
      req.headers['x-idempotency-key'] ||
      req.headers['idempotency-key'] ||
      (req.body && req.body.idempotency_key);

    const idempotencyKey = rawKey ? String(rawKey).trim() : null;

    if (!idempotencyKey) {
      if (isRequired) {
        return res.status(400).json({
          status: 'error',
          code: 'IDEMPOTENCY_KEY_REQUIRED',
          message: 'An "x-idempotency-key" header is required for this operation.'
        });
      }
      return next();
    }

    const fingerprint = createRequestFingerprint(req);
    const now = Date.now();
    const existing = idempotencyStore.get(idempotencyKey);

    // 2. Check if key already exists in store
    if (existing) {
      // Check if expired
      if (existing.expiresAt && existing.expiresAt < now) {
        idempotencyStore.delete(idempotencyKey);
      } else {
        // Detect payload tampering / mismatched request
        if (existing.fingerprint !== fingerprint) {
          return res.status(422).json({
            status: 'error',
            code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
            message: `Idempotency key "${idempotencyKey}" was previously used with a different request payload.`
          });
        }

        // Detect in-flight concurrent execution
        if (existing.state === 'PROCESSING') {
          return res.status(409).json({
            status: 'error',
            code: 'CONCURRENT_REQUEST',
            message: `A request with idempotency key "${idempotencyKey}" is currently being processed. Please wait for the initial submission to complete.`
          });
        }

        // Replay cached successful response
        if (existing.state === 'RESOLVED') {
          res.setHeader('x-idempotent-replay', 'true');
          res.setHeader('x-idempotency-key', idempotencyKey);
          return res.status(existing.statusCode).json(existing.body);
        }
      }
    }

    // 3. Mark key as PROCESSING
    idempotencyStore.set(idempotencyKey, {
      fingerprint,
      state: 'PROCESSING',
      createdAt: now,
      expiresAt: now + ttlMs,
      statusCode: null,
      body: null
    });

    res.setHeader('x-idempotency-key', idempotencyKey);

    // 4. Intercept response completion to cache response
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    let captured = false;

    const captureResponse = (body) => {
      if (captured) return;
      captured = true;

      const statusCode = res.statusCode || 200;

      // Only cache successful or client validation responses (don't permanently lock transient 5xx server crashes)
      if (statusCode < 500) {
        let parsedBody = body;
        if (typeof body === 'string') {
          try {
            parsedBody = JSON.parse(body);
          } catch (_) {
            parsedBody = body;
          }
        }

        idempotencyStore.set(idempotencyKey, {
          fingerprint,
          state: 'RESOLVED',
          createdAt: now,
          expiresAt: now + ttlMs,
          statusCode,
          body: parsedBody
        });
      } else {
        // Remove on 5xx server error so client can retry
        idempotencyStore.delete(idempotencyKey);
      }
    };

    res.json = function (data) {
      captureResponse(data);
      return originalJson(data);
    };

    res.send = function (data) {
      captureResponse(data);
      return originalSend(data);
    };

    return next();
  };
}

/**
 * Retrieve current store entry (useful for tests and inspection)
 */
function getIdempotencyRecord(key) {
  return idempotencyStore.get(key);
}

/**
 * Clear store (useful for tests)
 */
function clearIdempotencyStore() {
  idempotencyStore.clear();
}

module.exports = {
  idempotencyMiddleware,
  getIdempotencyRecord,
  clearIdempotencyStore,
  createRequestFingerprint
};
