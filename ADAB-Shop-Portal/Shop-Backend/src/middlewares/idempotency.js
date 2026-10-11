/**
 * Idempotency-Key Middleware for Order Status Changes, Return Transitions, Withdrawals & Webhooks
 *
 * Ensures that duplicate requests or webhook callbacks carrying the same Idempotency-Key
 * (or X-Idempotency-Key / X-Webhook-Event-Id) execute at most once.
 * Concurrent in-flight duplicates await the original request's completion and receive
 * the exact same response with header `X-Idempotency-Replayed: true`.
 */

const idempotencyStore = new Map();
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

function pruneExpiredKeys() {
  const now = Date.now();
  for (const [k, entry] of idempotencyStore.entries()) {
    if (entry.expiresAt && entry.expiresAt <= now) {
      idempotencyStore.delete(k);
    }
  }
}

function extractIdempotencyKey(req) {
  const raw =
    req.headers['idempotency-key'] ||
    req.headers['x-idempotency-key'] ||
    req.headers['x-webhook-event-id'] ||
    req.body?.idempotencyKey ||
    req.body?.idempotency_key ||
    req.body?.event_id;

  return raw ? String(raw).trim() : null;
}

async function idempotencyMiddleware(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const rawKey = extractIdempotencyKey(req);
  if (!rawKey) {
    return next();
  }

  if (idempotencyStore.size > 500) {
    pruneExpiredKeys();
  }

  const scopedKey = `${req.method}:${req.baseUrl}${req.path}:${rawKey}`;
  const existing = idempotencyStore.get(scopedKey);
  const now = Date.now();

  if (existing && existing.expiresAt > now) {
    if (existing.status === 'COMPLETED') {
      res.setHeader('X-Idempotency-Replayed', 'true');
      res.setHeader('X-Idempotency-Key', rawKey);
      return res.status(existing.statusCode).json(existing.body);
    }

    if (existing.status === 'IN_PROGRESS' && existing.promise) {
      try {
        const result = await existing.promise;
        res.setHeader('X-Idempotency-Replayed', 'true');
        res.setHeader('X-Idempotency-Key', rawKey);
        return res.status(result.statusCode).json(result.body);
      } catch (_) {
        // Original in-flight request failed; allow this request to proceed
      }
    }
  }

  let resolveInFlight;
  let rejectInFlight;
  const inFlightPromise = new Promise((resolve, reject) => {
    resolveInFlight = resolve;
    rejectInFlight = reject;
  });
  // Prevent unhandled rejection if no duplicate waiter is attached
  inFlightPromise.catch(() => {});

  idempotencyStore.set(scopedKey, {
    status: 'IN_PROGRESS',
    promise: inFlightPromise,
    expiresAt: now + DEFAULT_TTL_MS
  });

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const statusCode = res.statusCode || 200;
    if (statusCode >= 200 && statusCode < 300) {
      const completedEntry = {
        status: 'COMPLETED',
        statusCode,
        body,
        expiresAt: Date.now() + DEFAULT_TTL_MS
      };
      idempotencyStore.set(scopedKey, completedEntry);
      resolveInFlight(completedEntry);
      res.setHeader('X-Idempotency-Replayed', 'false');
      res.setHeader('X-Idempotency-Key', rawKey);
    } else {
      idempotencyStore.delete(scopedKey);
      rejectInFlight(new Error('Request failed with non-2xx status'));
    }
    return originalJson(body);
  };

  res.on('close', () => {
    const current = idempotencyStore.get(scopedKey);
    if (current && current.status === 'IN_PROGRESS') {
      idempotencyStore.delete(scopedKey);
      rejectInFlight(new Error('Connection closed before completion'));
    }
  });

  return next();
}

module.exports = {
  idempotencyMiddleware,
  idempotencyStore
};
