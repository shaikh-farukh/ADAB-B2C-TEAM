import express from 'express';
import { body, param } from 'express-validator';
import authMiddleware from '../../Middleware/auth.js';
import { isManufacturer } from '../../Middleware/roleCheck.js';
import * as categoryController from '../../controllers/categoryController.js';
import validate from '../../Middleware/validate.js';

const router = express.Router();

// All routes require authentication and manufacturer role
router.use(authMiddleware);
router.use(isManufacturer);

// Shared validations
const categoryIdParamValidation = [
  param('id').isInt().withMessage('Category ID must be an integer')
];

const categoryIdNestedParamValidation = [
  param('category_id').isInt().withMessage('Category ID must be an integer')
];

const subcategoryIdParamValidation = [
  param('id').isInt().withMessage('Subcategory ID must be an integer')
];

// ===== CATEGORY ROUTES =====

// Validation for category
const categoryValidation = [
  body('category_name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 100 })
    .withMessage('Category name must be 100 characters or less'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be 500 characters or less'),
  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean value')
];

const categoryUpdateValidation = [
  body('category_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Category name must be 100 characters or less'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be 500 characters or less'),
  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean value')
];

// Category routes
router.get('/', categoryController.getCategories);
router.get('/:id', categoryIdParamValidation, validate, categoryController.getCategory);
router.post('/', categoryValidation, validate, categoryController.createCategory);
router.put('/:id', categoryIdParamValidation, categoryUpdateValidation, validate, categoryController.updateCategory);
router.delete('/:id', categoryIdParamValidation, validate, categoryController.deleteCategory);

router.get('/categories', categoryController.getCategories);
router.get('/categories/:id', categoryIdParamValidation, validate, categoryController.getCategory);
router.post('/categories', categoryValidation, validate, categoryController.createCategory);
router.put('/categories/:id', categoryIdParamValidation, categoryUpdateValidation, validate, categoryController.updateCategory);
router.delete('/categories/:id', categoryIdParamValidation, validate, categoryController.deleteCategory);

// ===== SUBCATEGORY ROUTES =====

// Validation for subcategory
const subcategoryValidation = [
  body('subcategory_name')
    .trim()
    .notEmpty()
    .withMessage('Subcategory name is required')
    .isLength({ max: 100 })
    .withMessage('Subcategory name must be 100 characters or less'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be 500 characters or less'),
  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean value')
];

const subcategoryUpdateValidation = [
  body('subcategory_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Subcategory name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Subcategory name must be 100 characters or less'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be 500 characters or less'),
  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean value')
];

// Subcategory routes (nested under category)
router.get('/categories/:category_id/subcategories', categoryIdNestedParamValidation, validate, categoryController.getSubcategories);
router.post('/categories/:category_id/subcategories', categoryIdNestedParamValidation, subcategoryValidation, validate, categoryController.createSubcategory);
router.put('/subcategories/:id', subcategoryIdParamValidation, subcategoryUpdateValidation, validate, categoryController.updateSubcategory);
router.delete('/subcategories/:id', subcategoryIdParamValidation, validate, categoryController.deleteSubcategory);

export default router;