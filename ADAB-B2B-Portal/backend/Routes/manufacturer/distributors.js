import express from 'express';
import { param } from 'express-validator';
import authMiddleware from '../../Middleware/auth.js';
import { isManufacturer } from '../../Middleware/roleCheck.js';
import * as distributorController from '../../controllers/distributorController.js';
import * as territoryController from '../../controllers/territoryController.js';
import validate from '../../Middleware/validate.js';

const router = express.Router();

// All routes require authentication and manufacturer role
router.use(authMiddleware);
router.use(isManufacturer);

// Routes
router.get('/', distributorController.getDistributors);
router.get('/regions', distributorController.getRegions);

router.post('/territories', territoryController.assignTerritory);
router.get('/territories', territoryController.getTerritories);
router.delete('/territories/:id', territoryController.deleteTerritory);

router.get('/:id', [param('id').isInt().withMessage('Distributor ID must be an integer')], validate, distributorController.getDistributor);

export default router;