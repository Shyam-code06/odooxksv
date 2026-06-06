import express from 'express';
import PurchaseOrderController from './PurchaseOrderController.js';
import authMiddleware from '../../middleware/authMiddleware.js';
import rbacMiddleware from '../../middleware/rbacMiddleware.js';

const router = express.Router();
const poController = new PurchaseOrderController();

// Apply authentication middleware
router.use(authMiddleware);

// GET /api/purchaseorder - List POs (enforces vendor scope internally if vendor)
router.get('/', poController.getAll);

// GET /api/purchaseorder/:id - Get PO detail
router.get('/:id', poController.getById);

// POST /api/purchaseorder/generate - Generate PO manually
router.post('/generate', rbacMiddleware('viewusers'), poController.generatePO);

export default router;
