
import { validationResult } from 'express-validator';
import pool from '../Config/database.js';
import { createRazorpayOrder, verifyPaymentSignature, fetchPayment } from '../services/razorpayService.js';
import crypto from 'crypto';

/**
 * Creates a Razorpay checkout for a given logical order set.
 */
export const createCheckout = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const client = await pool.connect();

    try {
        const distributorId = req.user.userId;
        const { orderIds } = req.body;

        if (!Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ success: false, message: 'orderIds must be a non-empty array' });
        }

        await client.query('BEGIN');

        // Verify all orders exist, belong to this distributor, and require ONLINE payment
        const checkOrdersQuery = `
            SELECT id, manufacturer_id, total_amount, payment_mode, payment_status
            FROM manage_b_to_b_orders
            WHERE id = ANY($1) 
              AND distributor_id = $2
              AND payment_mode = 'ONLINE'
              AND deleted_at IS NULL
        `;
        const ordersResult = await client.query(checkOrdersQuery, [orderIds, distributorId]);

        if (ordersResult.rows.length !== orderIds.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'One or more orders are invalid, missing, or not eligible for ONLINE payment.' });
        }

        let totalRupees = 0;
        for (const row of ordersResult.rows) {
            if (row.payment_status !== 'UNPAID') {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: `Order ${row.id} has already been paid or is pending.` });
            }
            totalRupees += parseFloat(row.total_amount);
        }

        const totalPaise = Math.round(totalRupees * 100);

        if (totalPaise < 100) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Checkout total must be at least $1.' });
        }

        // --- Duplicate Prevention: Check for active payable checkout ---
        const existingCheckoutQuery = `
            SELECT rc.id, rc.razorpay_order_id, rc.status
            FROM razorpay_checkouts rc
            JOIN razorpay_checkout_orders rco ON rc.id = rco.checkout_id
            WHERE rco.order_id = ANY($1)
              AND rc.status IN ('INITIATED', 'CREATED', 'PENDING')
            LIMIT 1
        `;
        const existingResult = await client.query(existingCheckoutQuery, [orderIds]);

        if (existingResult.rows.length > 0) {
            const activeCheckout = existingResult.rows[0];
            await client.query('ROLLBACK');

            // If it already has a razorpay_order_id, return it so frontend can retry
            if (activeCheckout.status === 'CREATED' || activeCheckout.status === 'PENDING') {
                if (activeCheckout.razorpay_order_id) {
                    return res.status(200).json({
                        success: true,
                        message: 'Active checkout exists',
                        data: {
                            checkout_id: activeCheckout.id,
                            razorpay_order_id: activeCheckout.razorpay_order_id,
                            amount_paise: totalPaise
                        }
                    });
                }
            }

            return res.status(409).json({ success: false, message: 'An active checkout is already in progress for these orders.' });
        }

        const idempotencyKey = crypto.randomUUID();

        // 1. Insert Local DB (INITIATED)
        const insertCheckoutQuery = `
            INSERT INTO razorpay_checkouts (
                distributor_id, amount_paise, amount_rupees, currency, status, idempotency_key
            ) VALUES ($1, $2, $3, 'INR', 'INITIATED', $4)
            RETURNING id
        `;
        const checkoutResult = await client.query(insertCheckoutQuery, [
            distributorId, totalPaise, totalRupees, idempotencyKey
        ]);
        const checkoutId = checkoutResult.rows[0].id;

        for (const row of ordersResult.rows) {
            const orderPaise = Math.round(parseFloat(row.total_amount) * 100);
            await client.query(`
                INSERT INTO razorpay_checkout_orders (
                    checkout_id, order_id, manufacturer_id, order_amount_paise, order_amount_rupees
                ) VALUES ($1, $2, $3, $4, $5)
            `, [checkoutId, row.id, row.manufacturer_id, orderPaise, row.total_amount]);
        }

        // Commit transaction BEFORE calling Razorpay (3-phase pattern)
        await client.query('COMMIT');

        // 2. Call Razorpay API
        let rzpOrder;
        try {
            rzpOrder = await createRazorpayOrder(totalPaise, `checkout_${checkoutId}`);
        } catch (error) {
            // Update to PROVIDER_ERROR if it fails
            await client.query(`UPDATE razorpay_checkouts SET status = 'PROVIDER_ERROR' WHERE id = $1`, [checkoutId]);
            return res.status(502).json({ success: false, message: 'Failed to communicate with payment gateway.' });
        }

        // 3. Persist Razorpay Order ID
        await client.query(`
            UPDATE razorpay_checkouts 
            SET razorpay_order_id = $1, status = 'CREATED' 
            WHERE id = $2
        `, [rzpOrder.id, checkoutId]);

        return res.status(201).json({
            success: true,
            message: 'Checkout created successfully',
            data: {
                checkout_id: checkoutId,
                razorpay_order_id: rzpOrder.id,
                amount_paise: rzpOrder.amount
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in createCheckout:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
        client.release();
    }
};

/**
 * Client-side verification of payment after Razorpay modal succeeds.
 */
export const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const distributorId = req.user.userId;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing required payment verification details' });
    }

    const client = await pool.connect();

    try {
        // 1. HMAC Signature Verification
        const isSignatureValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!isSignatureValid) {
            return res.status(401).json({ success: false, message: 'Invalid payment signature' });
        }

        // 2. Server-side validation via Provider API Fetch (Amount & Tampering Protection)
        let paymentData;
        try {
            paymentData = await fetchPayment(razorpay_payment_id);
        } catch (err) {
            return res.status(502).json({ success: false, message: 'Failed to fetch payment details from provider' });
        }

        if (paymentData.order_id !== razorpay_order_id) {
            return res.status(401).json({ success: false, message: 'Payment order_id mismatch' });
        }

        if (paymentData.status !== 'captured') {
            return res.status(400).json({ success: false, message: 'Payment is not captured on provider' });
        }

        // 3. Start Database Transaction
        await client.query('BEGIN');

        // 4. Lock the checkout row (FOR UPDATE)
        const checkoutQuery = `
            SELECT id, amount_paise, status, distributor_id, idempotency_key 
            FROM razorpay_checkouts 
            WHERE razorpay_order_id = $1 
            FOR UPDATE
        `;
        const checkoutResult = await client.query(checkoutQuery, [razorpay_order_id]);

        if (checkoutResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Checkout not found' });
        }

        const checkout = checkoutResult.rows[0];

        // 5. Ownership Verification
        if (checkout.distributor_id !== distributorId) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: 'Unauthorized to verify this checkout' });
        }

        // 6. Amount validation against provider data
        if (Number(paymentData.amount) !== Number(checkout.amount_paise) || paymentData.currency !== 'INR') {
            console.error(`Amount mismatch debug: Razorpay=${paymentData.amount} (${typeof paymentData.amount}), DB=${checkout.amount_paise} (${typeof checkout.amount_paise})`);
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Amount or currency mismatch detected' });
        }

        // 7. State Machine Transition check
        if (checkout.status === 'CAPTURED') {
            // Already processed (idempotency)
            await client.query('ROLLBACK');
            return res.status(200).json({ success: true, message: 'Payment already verified and captured.' });
        }

        if (['FAILED', 'CANCELLED', 'PROVIDER_ERROR', 'REFUNDED'].includes(checkout.status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Checkout is in a terminal state and cannot be captured.' });
        }

        // 8. Apply Updates
        await client.query(`
            UPDATE razorpay_checkouts 
            SET status = 'CAPTURED', 
                razorpay_payment_id = $1, 
                payment_method = $2,
                signature_verified = TRUE,
                verification_source = 'client_verify',
                verified_at = CURRENT_TIMESTAMP,
                captured_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `, [razorpay_payment_id, paymentData.method, checkout.id]);

        // Update underlying order statuses OR invoice statuses
        if (checkout.idempotency_key && checkout.idempotency_key.startsWith('ledger_invoice_')) {
            const invoiceId = checkout.idempotency_key.split('_')[2];
            await client.query(`
                UPDATE manage_b_to_b_invoices
                SET status = 'paid', modified_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [invoiceId]);

            // Record the payment
            await client.query(`
                INSERT INTO manage_b_to_b_payments (distributor_id, invoice_id, amount, mode, reference_id, status)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [checkout.distributor_id, invoiceId, (checkout.amount_paise / 100), paymentData.method, razorpay_payment_id, 'completed']);

            // Fetch current balance for ledger
            const balanceResult = await client.query(
                `SELECT balance FROM manage_b_to_b_ledger_entries WHERE distributor_id = $1 ORDER BY id DESC LIMIT 1`,
                [checkout.distributor_id]
            );
            const currentBalance = balanceResult.rows.length > 0 ? parseFloat(balanceResult.rows[0].balance) : 0;
            const creditAmount = checkout.amount_paise / 100;

            // Record ledger entry (Credit)
            await client.query(`
                INSERT INTO manage_b_to_b_ledger_entries 
                (distributor_id, type, reference_id, description, debit, credit, balance, created_at)
                VALUES ($1, 'PAYMENT', $2, $3, 0, $4, $5, CURRENT_TIMESTAMP)
            `, [checkout.distributor_id, invoiceId, `Payment for Invoice #${invoiceId}`, creditAmount, currentBalance - creditAmount]);

        } else {
            await client.query(`
                UPDATE manage_b_to_b_orders
                SET payment_status = 'PAID', updated_at = CURRENT_TIMESTAMP
                WHERE id IN (
                    SELECT order_id FROM razorpay_checkout_orders WHERE checkout_id = $1
                )
            `, [checkout.id]);

            // Fetch current balance for ledger
            const balanceResult = await client.query(
                `SELECT balance FROM manage_b_to_b_ledger_entries WHERE distributor_id = $1 ORDER BY id DESC LIMIT 1`,
                [checkout.distributor_id]
            );
            const currentBalance = balanceResult.rows.length > 0 ? parseFloat(balanceResult.rows[0].balance) : 0;
            const creditAmount = checkout.amount_paise / 100;

            // Record ledger entry (Credit)
            await client.query(`
                INSERT INTO manage_b_to_b_ledger_entries 
                (distributor_id, type, reference_id, description, debit, credit, balance, created_at)
                VALUES ($1, 'PAYMENT', $2, $3, 0, $4, $5, CURRENT_TIMESTAMP)
            `, [checkout.distributor_id, checkout.id, `Online Payment for Checkout #${checkout.id}`, creditAmount, currentBalance - creditAmount]);
        }

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                checkout_id: checkout.id,
                status: 'CAPTURED'
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error verifying payment:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
        client.release();
    }
};

/**
 * Handles explicit payment failure from the frontend modal.
 */
export const handlePaymentFailure = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, error_code, error_description, failure_reason } = req.body;
    const distributorId = req.user.userId;

    if (!razorpay_order_id) {
        return res.status(400).json({ success: false, message: 'Missing razorpay_order_id' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const checkoutQuery = `
            SELECT id, status, distributor_id 
            FROM razorpay_checkouts 
            WHERE razorpay_order_id = $1 
            FOR UPDATE
        `;
        const checkoutResult = await client.query(checkoutQuery, [razorpay_order_id]);

        if (checkoutResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Checkout not found' });
        }

        const checkout = checkoutResult.rows[0];

        if (checkout.distributor_id !== distributorId) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Do not downgrade a successful payment
        if (checkout.status === 'CAPTURED') {
            await client.query('ROLLBACK');
            return res.status(200).json({ success: true, message: 'Payment is already captured. Failure ignored.' });
        }

        await client.query(`
            UPDATE razorpay_checkouts 
            SET status = 'FAILED', 
                razorpay_payment_id = $1,
                error_code = $2,
                error_description = $3,
                failure_reason = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
        `, [razorpay_payment_id || null, error_code, error_description, failure_reason, checkout.id]);

        await client.query('COMMIT');

        return res.status(200).json({ success: true, message: 'Payment failure recorded' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error handling payment failure:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
        client.release();
    }
};

export const createLedgerCheckout = async (req, res) => {
    const distributorId = req.user.userId;
    const client = await pool.connect();
    try {
        const { amount, invoice_id } = req.body;
        if (!amount || amount <= 0 || !invoice_id) {
            return res.status(400).json({ success: false, message: 'Invalid amount or invoice_id' });
        }
        
        await client.query('BEGIN');
        const totalPaise = Math.round(amount * 100);
        
        const rzpOrder = await createRazorpayOrder(
            totalPaise,
            'ledger_receipt_' + Date.now()
        );
        
        // Insert into razorpay_checkouts
        const insertResult = await client.query(`
            INSERT INTO razorpay_checkouts (
                distributor_id, amount_paise, amount_rupees, currency, status, idempotency_key, razorpay_order_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
        `, [
            distributorId, totalPaise, amount, 'INR', 'CREATED', `ledger_invoice_${invoice_id}_${Date.now()}`, rzpOrder.id
        ]);
        
        await client.query('COMMIT');
        
        return res.status(201).json({
            success: true,
            message: 'Ledger checkout created successfully',
            data: {
                checkout_id: insertResult.rows[0].id,
                razorpay_order_id: rzpOrder.id,
                amount_paise: rzpOrder.amount
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in createLedgerCheckout:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
        client.release();
    }
};
