import express from 'express';
import ApprovalController from './ApprovalController.js';
import authMiddleware from '../../middleware/authMiddleware.js';
import rbacMiddleware from '../../middleware/rbacMiddleware.js';

const router = express.Router();
const approvalController = new ApprovalController();

// Apply authentication middleware
router.use(authMiddleware);

// GET /api/approval/pending - Get pending decisions (Manager/Admin only)
router.get('/pending', rbacMiddleware('dashboard'), approvalController.getPending);

// GET /api/approval/history - Get approval history (Manager/Admin only)
router.get('/history', rbacMiddleware('dashboard'), approvalController.getHistory);

// POST /api/approval/submit - Submit quotation choice for approval
router.post('/submit', rbacMiddleware('viewusers'), approvalController.submit);

// POST /api/approval/decide/:stepId - Approve or Reject step with remarks
router.post('/decide/:stepId', rbacMiddleware('dashboard'), approvalController.decide);

export default router;
