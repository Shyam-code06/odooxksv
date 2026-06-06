import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';

import ReportController from './ReportController.js';

const router = express.Router();
const reportController = new ReportController();

// Apply authentication middleware
router.use(authMiddleware);

// GET /api/report/spending - Fetch spend report metrics
router.get('/spending', reportController.getSpendingSummary);

// GET /api/report/vendor-performance - Fetch vendor metrics
router.get('/vendor-performance', reportController.getVendorPerformance);

export default router;
