import express from 'express';
import authMiddleware from '../../Middleware/auth.js';
import { isManufacturer } from '../../Middleware/roleCheck.js';
import * as auditLogController from '../../controllers/auditLogController.js';

const router = express.Router();

router.use(authMiddleware);
router.use(isManufacturer);

router.get('/', auditLogController.getMyAuditLogs);

export default router;
