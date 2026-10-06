// =============================================================
//  Routes/payoutSettlement.js
//  Single route file covering all 5 endpoint groups.
// =============================================================

import express from 'express';
import { body, param, query } from 'express-validator';
import authMiddleware from '../Middleware/auth.js';
import { isManufacturer, isDistributor } from '../Middleware/roleCheck.js';
import {
  createInvoice,
  recordPayment,
  allocatePayment,
  autoAllocatePayment,
  updateLedger,
  calculateDistributorBalance,
  generateSettlement,
  calculateSettlementDeductions,
  applyCreditNote,
  handleOverpayment,
  createPayout,
  updatePayoutStatus,
  reconcilePayments,
  validateCreditLimit,
  getInvoices,
  getInvoice,
  downloadInvoicePdf,
  getAgingReport,
  getSettlements,
  getPayments,
  getLedgerEntries
} from '../controllers/payoutsettlementcontroller.js';

const router = express.Router();

// =============================================================
//  VALIDATION CHAINS
// =============================================================

const createInvoiceValidation = [
  body('order_id').isInt({ min: 1 }).withMessage('Valid order_id required'),
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.name').trim().notEmpty().withMessage('Each item must have a name'),
  body('items.*.qty').isInt({ min: 1 }).withMessage('Each item qty must be >= 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Each item price must be >= 0'),
  body('gst').optional().isFloat({ min: 0, max: 100 }).withMessage('gst must be between 0 and 100'),
  body('due_date').optional().isISO8601().withMessage('due_date must be a valid date (YYYY-MM-DD)')
];

const recordPaymentValidation = [
  body('distributor_id').isInt({ min: 1 }).withMessage('Valid distributor_id required'),
  body('shop_id').optional().isInt({ min: 1 }).withMessage('Valid shop_id must be integer'),
  body('invoice_id').optional().isInt({ min: 1 }).withMessage('Valid invoice_id must be integer'),
  body('amount').isFloat({ min: 0.01 }).withMessage('amount must be greater than 0'),
  body('mode')
    .trim().notEmpty().withMessage('payment mode required')
    .custom(value => {
      const allowed = ['UPI', 'NEFT', 'RTGS', 'IMPS', 'cheque', 'cash', 'online', 'Bank Transfer'];
      if (!allowed.some(m => m.toLowerCase() === value.toLowerCase())) {
        throw new Error('mode must be one of: UPI, NEFT, RTGS, IMPS, cheque, cash, online, Bank Transfer');
      }
      return true;
    }),
  body('reference_id').optional().trim().isLength({ max: 120 })
];

const allocatePaymentValidation = [
  body('payment_id').isInt({ min: 1 }).withMessage('Valid payment_id required'),
  body('allocations').isArray({ min: 1 }).withMessage('allocations must be a non-empty array'),
  body('allocations.*.invoice_id').isInt({ min: 1 }).withMessage('Each allocation needs a valid invoice_id'),
  body('allocations.*.amount').isFloat({ min: 0.01 }).withMessage('Each allocation amount must be > 0')
];

const updateLedgerValidation = [
  body('distributor_id').isInt({ min: 1 }).withMessage('Valid distributor_id required'),
  body('debit').optional().isFloat({ min: 0 }),
  body('credit').optional().isFloat({ min: 0 }),
  body('description').trim().notEmpty().withMessage('description required')
];

const generateSettlementValidation = [
  body('manufacturer_id').isInt({ min: 1 }).withMessage('Valid manufacturer_id required')
];

const applyCreditNoteValidation = [
  body('invoice_id').isInt({ min: 1 }).withMessage('Valid invoice_id required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('amount must be > 0'),
  body('reason').trim().notEmpty().withMessage('reason is required')
];

const createPayoutValidation = [
  body('settlement_id').isInt({ min: 1 }).withMessage('Valid settlement_id required')
];

const updatePayoutStatusValidation = [
  body('status')
    .isIn(['success', 'failed'])
    .withMessage('status must be success or failed'),
  body('transaction_ref').optional().trim().isLength({ max: 120 }),
  body('failure_reason').optional().trim()
];


// =============================================================
//  INVOICE ROUTES
//  POST   /api/invoices              → createInvoice       (manufacturer/distributor)
//  GET    /api/invoices              → getInvoices         (both)
//  GET    /api/invoices/aging        → getAgingReport      (both)
//  GET    /api/invoices/:id          → getInvoice          (both)
//  GET    /api/invoices/:id/download → downloadInvoicePdf  (both)
// =============================================================

router.post(
  '/invoices',
  authMiddleware,
  createInvoiceValidation,
  createInvoice
);

router.get(
  '/invoices',
  authMiddleware,
  getInvoices
);

router.get(
  '/invoices/aging',
  authMiddleware,
  getAgingReport
);

router.get(
  '/aging-report',
  authMiddleware,
  getAgingReport
);

router.get(
  '/invoices/:id',
  authMiddleware,
  getInvoice
);

router.get(
  '/invoices/:id/download',
  authMiddleware,
  downloadInvoicePdf
);


// =============================================================
//  PAYMENT ROUTES
//  POST   /api/payments                         → recordPayment
//  POST   /api/payments/allocate                → allocatePayment
//  POST   /api/payments/:id/auto-allocate       → autoAllocatePayment
//  POST   /api/payments/:id/handle-overpayment  → handleOverpayment
//  GET    /api/payments/reconcile/:distributor_id → reconcilePayments
// =============================================================

// NOTE: specific paths before /:id to avoid Express matching conflicts
router.post(
  '/payments',
  authMiddleware,
  recordPaymentValidation,
  recordPayment
);

router.get(
  '/payments',
  authMiddleware,
  getPayments
);

router.post(
  '/payments/allocate',
  authMiddleware, isManufacturer,
  allocatePaymentValidation,
  allocatePayment
);

router.post(
  '/payments/:id/auto-allocate',
  authMiddleware, isManufacturer,
  autoAllocatePayment
);

router.post(
  '/payments/:id/handle-overpayment',
  authMiddleware, isManufacturer,
  handleOverpayment
);

router.get(
  '/payments/reconcile/:distributor_id',
  authMiddleware, isManufacturer,
  reconcilePayments
);


// =============================================================
//  LEDGER ROUTES
//  POST   /api/ledger/entry                     → updateLedger (admin/manufacturer)
//  GET    /api/ledger/:distributor_id/balance   → calculateDistributorBalance
// =============================================================

router.post(
  '/ledger/entry',
  authMiddleware, isManufacturer,
  updateLedgerValidation,
  updateLedger
);

router.get(
  '/ledger/:distributor_id/balance',
  authMiddleware,
  calculateDistributorBalance
);

router.get(
  '/ledger',
  authMiddleware,
  getLedgerEntries
);


// =============================================================
//  SETTLEMENT ROUTES
//  POST   /api/settlements/generate       → generateSettlement  (manufacturer)
//  GET    /api/settlements/:id/deductions → calculateSettlementDeductions
// =============================================================

router.post(
  '/settlements/generate',
  authMiddleware, isManufacturer,
  generateSettlementValidation,
  generateSettlement
);

router.get(
  '/settlements/:id/deductions',
  authMiddleware, isManufacturer,
  calculateSettlementDeductions
);

router.get(
  '/settlements',
  authMiddleware,
  getSettlements
);

router.patch(
  '/settlements/:id/status',
  authMiddleware, isManufacturer,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { status } = req.body;

      await client.query('BEGIN');
      const sCheck = await client.query('SELECT * FROM manage_b_to_b_settlements WHERE id = $1 FOR UPDATE', [id]);
      if (sCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Settlement not found' });
      }

      const result = await client.query(
        'UPDATE manage_b_to_b_settlements SET status = $1, modified_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      );

      await client.query('COMMIT');
      res.status(200).json({ success: true, data: result.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(e);
      res.status(500).json({ success: false, message: 'Failed to update settlement status' });
    } finally {
      client.release();
    }
  }
);


// =============================================================
//  CREDIT NOTE ROUTES
//  POST   /api/credit-notes   → applyCreditNote (manufacturer)
// =============================================================

router.post(
  '/credit-notes',
  authMiddleware, isManufacturer,
  applyCreditNoteValidation,
  applyCreditNote
);


// =============================================================
//  PAYOUT ROUTES
//  POST   /api/payouts             → createPayout (manufacturer)
//  PATCH  /api/payouts/:id/status  → updatePayoutStatus (manufacturer)
// =============================================================

router.post(
  '/payouts',
  authMiddleware, isManufacturer,
  createPayoutValidation,
  createPayout
);

router.patch(
  '/payouts/:id/status',
  authMiddleware, isManufacturer,
  updatePayoutStatusValidation,
  updatePayoutStatus
);


// =============================================================
//  CREDIT LIMIT ROUTES
//  GET  /api/distributors/:id/credit-limit  → validateCreditLimit
// =============================================================

router.get(
  '/distributors/:id/credit-limit',
  authMiddleware,
  validateCreditLimit
);


export default router;