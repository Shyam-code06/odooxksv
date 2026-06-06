import express from 'express';
import DashboardController from './DashboardController.js';
import authMiddleware from '../../middleware/authMiddleware.js';
import rbacMiddleware from '../../middleware/rbacMiddleware.js';

const router = express.Router();
const dashboardController = new DashboardController();

// GET /api/dashboard/stats - Protected by dashboard permission
router.get('/stats', authMiddleware, rbacMiddleware('dashboard'), dashboardController.getStats);

export default router;
