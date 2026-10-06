
import pool from '../Config/database.js';
import { verifyWebhookSignature } from '../services/razorpayService.js';

export const handleWebhook = async (req, res) => {
    // req.body should be the raw Buffer string via express.raw()
    const rawBody = req.body.toString('utf8');
    const signature = req.headers['x-razorpay-signature'];
    const eventId = req.headers['x-razorpay-event-id'];

    if (!signature || !eventId) {
        return res.status(401).json({ success: false, message: 'Missing Razorpay signature or event ID' });
    }

    if (!verifyWebhookSignature(rawBody, signature)) {
        return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }

    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
    }

    const eventType = payload.event;
    const paymentData = payload.payload?.payment?.entity;

    if (!paymentData) {
        return res.status(400).json({ success: false, message: 'Malformed payload' });
    }

    const rzpOrderId = paymentData.order_id;
    const rzpPaymentId = paymentData.id;

    if (!rzpOrderId) {
        return res.status(400).json({ success: false, message: 'Missing order_id in payload' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Idempotency Check
        const eventQuery = `SELECT processing_status FROM razorpay_webhook_events WHERE event_id = $1 FOR UPDATE`;
        const eventResult = await client.query(eventQuery, [eventId]);

        if (eventResult.rows.length > 0) {
            const status = eventResult.rows[0].processing_status;
            if (['PROCESSED', 'SKIPPED'].includes(status)) {
                await client.query('ROLLBACK');
                return res.status(200).send('Event already processed or skipped');
            }
            if (status === 'PROCESSING') {
                await client.query('ROLLBACK');
                // Assuming safety timeout is needed for stale PROCESSING, but returning 409 forces a Razorpay retry later.
                return res.status(409).send('Event currently processing');
            }
            // If FAILED, we will retry processing
            await client.query(`UPDATE razorpay_webhook_events SET processing_status = 'PROCESSING' WHERE event_id = $1`, [eventId]);
        } else {
            // New event
            await client.query(`
                INSERT INTO razorpay_webhook_events 
                (event_id, event_type, razorpay_order_id, razorpay_payment_id, processing_status, source_ip)
                VALUES ($1, $2, $3, $4, 'PROCESSING', $5)
            `, [eventId, eventType, rzpOrderId, rzpPaymentId, req.ip]);
        }

        // 2. Lock Checkout Row
        const checkoutQuery = `
            SELECT id, amount_paise, status 
            FROM razorpay_checkouts 
            WHERE razorpay_order_id = $1 
            FOR UPDATE
        `;
        const checkoutResult = await client.query(checkoutQuery, [rzpOrderId]);

        if (checkoutResult.rows.length === 0) {
            // Checkout doesn't exist locally (could be invalid or stale webhook)
            await client.query(`
                UPDATE razorpay_webhook_events 
                SET processing_status = 'SKIPPED', skip_reason = 'checkout_not_found', processed_at = CURRENT_TIMESTAMP 
                WHERE event_id = $1
            `, [eventId]);
            await client.query('COMMIT');
            return res.status(200).send('Skipped: Checkout not found');
        }

        const checkout = checkoutResult.rows[0];

        // 3. Amount/Currency Validation
        if (paymentData.amount !== checkout.amount_paise || paymentData.currency !== 'INR') {
            await client.query(`
                UPDATE razorpay_webhook_events 
                SET processing_status = 'SKIPPED', skip_reason = 'amount_currency_mismatch', processed_at = CURRENT_TIMESTAMP 
                WHERE event_id = $1
            `, [eventId]);
            await client.query('COMMIT');
            return res.status(200).send('Skipped: Amount or currency mismatch');
        }

        // 4. State Machine processing
        if (eventType === 'payment.captured') {
            if (checkout.status === 'CAPTURED') {
                await client.query(`
                    UPDATE razorpay_webhook_events 
                    SET processing_status = 'SKIPPED', skip_reason = 'already_captured', processed_at = CURRENT_TIMESTAMP 
                    WHERE event_id = $1
                `, [eventId]);
                await client.query('COMMIT');
                return res.status(200).send('Skipped: Already captured');
            }

            if (['FAILED', 'CANCELLED', 'PROVIDER_ERROR', 'REFUNDED'].includes(checkout.status)) {
                await client.query(`
                    UPDATE razorpay_webhook_events 
                    SET processing_status = 'SKIPPED', skip_reason = 'terminal_state_conflict', processed_at = CURRENT_TIMESTAMP 
                    WHERE event_id = $1
                `, [eventId]);
                await client.query('COMMIT');
                return res.status(200).send('Skipped: Terminal state conflict');
            }

            // Apply CAPTURED updates
            await client.query(`
                UPDATE razorpay_checkouts 
                SET status = 'CAPTURED', 
                    razorpay_payment_id = $1, 
                    payment_method = $2,
                    webhook_verified = TRUE,
                    verification_source = 'webhook',
                    verified_at = CURRENT_TIMESTAMP,
                    captured_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `, [rzpPaymentId, paymentData.method, checkout.id]);

            await client.query(`
                UPDATE manage_b_to_b_orders
                SET payment_status = 'PAID', updated_at = CURRENT_TIMESTAMP
                WHERE id IN (
                    SELECT order_id FROM razorpay_checkout_orders WHERE checkout_id = $1
                )
            `, [checkout.id]);

            await client.query(`
                UPDATE razorpay_webhook_events 
                SET processing_status = 'PROCESSED', processed_at = CURRENT_TIMESTAMP 
                WHERE event_id = $1
            `, [eventId]);

        } else if (eventType === 'payment.failed') {
            if (checkout.status === 'CAPTURED') {
                await client.query(`
                    UPDATE razorpay_webhook_events 
                    SET processing_status = 'SKIPPED', skip_reason = 'ignore_late_failure', processed_at = CURRENT_TIMESTAMP 
                    WHERE event_id = $1
                `, [eventId]);
                await client.query('COMMIT');
                return res.status(200).send('Skipped: Ignored late failure');
            }

            await client.query(`
                UPDATE razorpay_checkouts 
                SET status = 'FAILED', 
                    razorpay_payment_id = $1,
                    error_code = $2,
                    error_description = $3,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
            `, [rzpPaymentId, paymentData.error_code, paymentData.error_description, checkout.id]);

            await client.query(`
                UPDATE razorpay_webhook_events 
                SET processing_status = 'PROCESSED', processed_at = CURRENT_TIMESTAMP 
                WHERE event_id = $1
            `, [eventId]);

        } else {
            // Other events (e.g., payment.authorized, order.paid, etc.)
            await client.query(`
                UPDATE razorpay_webhook_events 
                SET processing_status = 'SKIPPED', skip_reason = 'unsupported_event', processed_at = CURRENT_TIMESTAMP 
                WHERE event_id = $1
            `, [eventId]);
        }

        await client.query('COMMIT');
        return res.status(200).send('Webhook processed');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Webhook processing error:', error);

        // Log the failure to retry later
        const client2 = await pool.connect();
        try {
            await client2.query(`
                UPDATE razorpay_webhook_events 
                SET processing_status = 'FAILED', processing_error = $1 
                WHERE event_id = $2
            `, [error.message, eventId]);
        } catch (err2) {
            console.error('Failed to update webhook event failure status', err2);
        } finally {
            client2.release();
        }

        return res.status(500).send('Internal server error');
    } finally {
        client.release();
    }
};
