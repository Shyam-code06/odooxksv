import express from 'express';
import AuditLogController from './AuditLogController.js';
import authMiddleware from '../../middleware/authMiddleware.js';
import rbacMiddleware from '../../middleware/rbacMiddleware.js';

const router = express.Router();
const auditController = new AuditLogController();

router.get('/', authMiddleware, rbacMiddleware('viewactivitylogs'), auditController.getAll);

export default router;
