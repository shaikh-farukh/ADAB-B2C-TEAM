import express from 'express';
import { body, param } from 'express-validator';
import authMiddleware from '../../Middleware/auth.js';
import * as productController from '../../controllers/productController.js';
import { isManufacturer } from '../../Middleware/roleCheck.js';
import validate from '../../Middleware/validate.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authMiddleware);
router.use(isManufacturer);

// Validation
const addProductValidation = [
  body('product_name').trim().notEmpty().withMessage('Product name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('currency').optional({ values: 'falsy' }).trim(),
  body('moq').isInt({ min: 1 }).withMessage('MOQ must be at least 1'),
  body('stock_quantity').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('Stock quantity must be a positive number'),
  body('category').optional({ values: 'falsy' }).trim(),
  body('sub_category').optional({ values: 'falsy' }).trim(),
  body('description').optional({ values: 'falsy' }).trim(),
  body('international_selling').optional({ values: 'falsy' }).isBoolean(),
  body('international_price').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('export_hs_code').optional({ values: 'falsy' }).trim(),
  body('hsn_code').optional({ values: 'falsy' }).trim(),
  body('gst_rate').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('GST rate must be a positive number'),
  body('tier_pricing').optional({ values: 'falsy' }),
  body('status').optional({ values: 'falsy' }).isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
];

const updateProductValidation = [
  body('product_name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('currency').optional({ values: 'falsy' }).trim(),
  body('moq').optional().isInt({ min: 1 }).withMessage('MOQ must be at least 1'),
  body('stock_quantity').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('Stock quantity must be a positive number'),
  body('category').optional({ values: 'falsy' }).trim(),
  body('sub_category').optional({ values: 'falsy' }).trim(),
  body('description').optional({ values: 'falsy' }).trim(),
  body('international_selling').optional({ values: 'falsy' }).isBoolean(),
  body('international_price').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('export_hs_code').optional({ values: 'falsy' }).trim(),
  body('hsn_code').optional({ values: 'falsy' }).trim(),
  body('gst_rate').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('GST rate must be a positive number'),
  body('tier_pricing').optional({ values: 'falsy' }),
  body('status').optional({ values: 'falsy' }).isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
];

const toggleStatusValidation = [
  body('status').isIn(['active', 'inactive']).withMessage('Status must be "active" or "inactive"')
];

const idParamValidation = [
  param('id').isInt().withMessage('Product ID must be an integer')
];

// Routes
router.get('/warehouses', productController.getManufacturerWarehouseInventory);
router.get('/stats', productController.getProductStats);
router.post('/bulk-import', upload.single('file'), productController.bulkImportProducts);
router.get('/bulk-export', productController.bulkExportProducts);
router.post('/', addProductValidation, validate, productController.addProduct);
router.get('/', productController.getProducts);
router.get('/:id/warehouses', idParamValidation, validate, productController.getWarehouseStock);
router.put('/:id/warehouses', idParamValidation, validate, productController.updateWarehouseStock);
router.get('/:id', idParamValidation, validate, productController.getProduct);
router.put('/:id', idParamValidation, updateProductValidation, validate, productController.updateProduct);
router.delete('/:id', idParamValidation, validate, productController.deleteProduct);
router.patch('/:id/status', idParamValidation, toggleStatusValidation, validate, productController.toggleProductStatus);

export default router;