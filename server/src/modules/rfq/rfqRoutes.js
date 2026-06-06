import express from 'express';
import RfqController from './RfqController.js';
import authMiddleware from '../../middleware/authMiddleware.js';
import rbacMiddleware from '../../middleware/rbacMiddleware.js';

const router = express.Router();
const rfqController = new RfqController();

// Apply authentication middleware
router.use(authMiddleware);

// GET /api/rfq - List RFQs (accessible to all authenticated users; filtered inside controller)
router.get('/', rfqController.getAll);

// GET /api/rfq/:id - Get detailed RFQ (vendors + quotes)
router.get('/:id', rfqController.getById);

// POST /api/rfq - Create a new RFQ (Procurement Officer or Admin)
router.post('/', rbacMiddleware('viewusers'), rfqController.create);

// PUT /api/rfq/:id - Update RFQ details (Procurement Officer or Admin)
router.put('/:id', rbacMiddleware('viewusers'), rfqController.update);

// POST /api/rfq/:id/publish - Publish an RFQ (Procurement Officer or Admin)
router.post('/:id/publish', rbacMiddleware('viewusers'), rfqController.publish);

// POST /api/rfq/:id/request-approval - Request Manager Approval to publish an RFQ
router.post('/:id/request-approval', rbacMiddleware('viewusers'), rfqController.requestApproval);

// POST /api/rfq/:id/close - Close an RFQ (Procurement Officer or Admin)
router.post('/:id/close', rbacMiddleware('viewusers'), rfqController.close);

export default router;
