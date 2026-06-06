import express from 'express';
import InvoiceController from './InvoiceController.js';
import authMiddleware from '../../middleware/authMiddleware.js';
import rbacMiddleware from '../../middleware/rbacMiddleware.js';

const router = express.Router();
const invoiceController = new InvoiceController();

// Apply authentication middleware
router.use(authMiddleware);

// GET /api/invoice - List invoices
router.get('/', invoiceController.getAll);

// GET /api/invoice/:id - Get invoice detail (items)
router.get('/:id', invoiceController.getById);

// POST /api/invoice - Generate invoice from a PO
router.post('/', rbacMiddleware('dashboard'), invoiceController.create);

export default router;
