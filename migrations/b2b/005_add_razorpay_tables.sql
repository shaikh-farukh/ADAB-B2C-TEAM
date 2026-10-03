-- 005_add_razorpay_tables.sql

CREATE TABLE IF NOT EXISTS razorpay_checkouts (
    id                    SERIAL PRIMARY KEY,
    
    -- Distributor reference
    distributor_id        INTEGER NOT NULL,
    
    -- Razorpay-generated data
    razorpay_order_id     VARCHAR(100),              -- NULL until Razorpay order created
    razorpay_payment_id   VARCHAR(100),              -- NULL until payment captured
    
    -- Payment details (authoritative, server-calculated)
    amount_paise          BIGINT NOT NULL,            -- Amount in paise (smallest currency unit)
    amount_rupees         NUMERIC(12,2) NOT NULL,     -- Display amount
    currency              VARCHAR(10) NOT NULL DEFAULT 'INR',
    
    -- Checkout lifecycle status (local state, NOT settlement)
    status                VARCHAR(30) DEFAULT 'INITIATED' 
                          CHECK (status IN (
                              'INITIATED',        -- Orders created, Razorpay API not yet called
                              'CREATED',          -- Razorpay order created, awaiting payment
                              'PENDING',          -- Payment attempt in progress
                              'AUTHORIZED',       -- Razorpay authorized (pre-capture, if applicable)
                              'CAPTURED',         -- Razorpay payment captured — funds collected
                              'FAILED',           -- Payment failed
                              'CANCELLED',        -- Cancelled by user/system
                              'PROVIDER_ERROR',   -- Razorpay API call failed after order creation
                              'REFUNDED'          -- Full refund (Phase 2)
                          )),
    payment_method        VARCHAR(50),               -- card, upi, netbanking, wallet (from Razorpay)
    
    -- Verification audit
    signature_verified    BOOLEAN DEFAULT FALSE,      -- Was client-side signature verification successful?
    webhook_verified      BOOLEAN DEFAULT FALSE,      -- Was a webhook.captured event received and verified?
    verification_source   VARCHAR(20),               -- 'client_verify' or 'webhook'
    verified_at           TIMESTAMP,                  -- When verification completed
    
    -- Failure information
    failure_reason        TEXT,
    error_code            VARCHAR(100),
    error_description     TEXT,
    
    -- Idempotency
    idempotency_key       VARCHAR(100) UNIQUE,
    
    -- Timestamps
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    captured_at           TIMESTAMP,                  -- When payment was captured
    
    -- Constraints
    UNIQUE(razorpay_order_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rzp_co_distributor_id ON razorpay_checkouts(distributor_id);
CREATE INDEX IF NOT EXISTS idx_rzp_co_razorpay_order_id ON razorpay_checkouts(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_rzp_co_razorpay_payment_id ON razorpay_checkouts(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_rzp_co_status ON razorpay_checkouts(status);
CREATE INDEX IF NOT EXISTS idx_rzp_co_created_at ON razorpay_checkouts(created_at);
-- Reconciliation index: find stale checkouts
CREATE INDEX IF NOT EXISTS idx_rzp_co_stale ON razorpay_checkouts(status, created_at)
    WHERE status IN ('INITIATED', 'CREATED', 'PENDING');


CREATE TABLE IF NOT EXISTS razorpay_checkout_orders (
    id                    SERIAL PRIMARY KEY,
    checkout_id           INTEGER NOT NULL REFERENCES razorpay_checkouts(id),
    order_id              INTEGER NOT NULL REFERENCES manage_b_to_b_orders(id),
    manufacturer_id       INTEGER NOT NULL,
    order_amount_paise    BIGINT NOT NULL,            -- This order's share of the total
    order_amount_rupees   NUMERIC(12,2) NOT NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(checkout_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_rzp_co_orders_checkout ON razorpay_checkout_orders(checkout_id);
CREATE INDEX IF NOT EXISTS idx_rzp_co_orders_order ON razorpay_checkout_orders(order_id);


CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
    id                    SERIAL PRIMARY KEY,
    
    -- Provider identifiers
    event_id              VARCHAR(100) NOT NULL UNIQUE,  -- X-Razorpay-Event-Id
    event_type            VARCHAR(100) NOT NULL,         -- e.g. 'payment.captured', 'payment.failed'
    
    -- References extracted from payload
    razorpay_order_id     VARCHAR(100),
    razorpay_payment_id   VARCHAR(100),
    
    -- Processing status
    processing_status     VARCHAR(30) DEFAULT 'RECEIVED'
                          CHECK (processing_status IN (
                              'RECEIVED',           -- Event received, not yet processed
                              'PROCESSING',         -- Currently being processed
                              'PROCESSED',          -- Successfully processed
                              'SKIPPED',            -- Intentionally skipped (unsupported event, already handled)
                              'FAILED'              -- Processing failed (will be retried by Razorpay)
                          )),
    skip_reason           VARCHAR(200),              -- Why SKIPPED (e.g. 'already_captured', 'unsupported_event')
    processing_error      TEXT,                      -- Error details if FAILED
    
    -- Audit
    received_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at          TIMESTAMP,
    source_ip             VARCHAR(45),               -- Webhook sender IP for audit
    
    -- Raw payload for debugging (optional, consider retention policy)
    payload_summary       JSONB                      -- Sanitized subset of payload for debugging
);

CREATE INDEX IF NOT EXISTS idx_rzp_wh_event_id ON razorpay_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_rzp_wh_razorpay_order_id ON razorpay_webhook_events(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_rzp_wh_razorpay_payment_id ON razorpay_webhook_events(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_rzp_wh_processing_status ON razorpay_webhook_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_rzp_wh_received_at ON razorpay_webhook_events(received_at);
