import express from 'express';
import * as distributorController from '../../controllers/distributorController.js';
import auth from '../../Middleware/auth.js';

const router = express.Router();

router.use(auth);
router.get('/', distributorController.getServiceableTerritory);
router.put('/', distributorController.updateServiceableTerritory);

export default router;
