import express from 'express';
import { param } from 'express-validator';
import authMiddleware from '../../Middleware/auth.js';
import { isDistributor } from '../../Middleware/roleCheck.js';
import * as manufacturersController from '../../controllers/distributorManufacturersController.js';
import validate from '../../Middleware/validate.js';

const router = express.Router();

// All routes require authentication and distributor role
router.use(authMiddleware);
router.use(isDistributor);

const idParamValidation = [
  param('id').isInt().withMessage('Manufacturer ID must be an integer')
];

// Routes
router.get('/', manufacturersController.getManufacturers);
router.get('/categories', manufacturersController.getCategories);
router.get('/:id', idParamValidation, validate, manufacturersController.getManufacturer);

export default router;