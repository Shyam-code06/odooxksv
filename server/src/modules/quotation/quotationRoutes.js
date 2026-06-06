import express from 'express';
import QuotationController from './QuotationController.js';
import authMiddleware from '../../middleware/authMiddleware.js';
import rbacMiddleware from '../../middleware/rbacMiddleware.js';

const router = express.Router();
const quotationController = new QuotationController();

// Apply authentication middleware
router.use(authMiddleware);

// GET /api/quotation - List quotations
router.get('/', quotationController.getAll);

// GET /api/quotation/:id - View quotation detail (items)
router.get('/:id', quotationController.getById);

// POST /api/quotation - Submit quotation (Vendor only)
router.post('/', rbacMiddleware('dashboard'), quotationController.submit);

// GET /api/quotation/compare/:rfqId - Compare quotations (Procurement Officer / Admin / Manager)
router.get('/compare/:rfqId', rbacMiddleware('dashboard'), quotationController.compare);

// POST /api/quotation/:id/officer-approve - Officer approves quotation offer (Procurement Officer / Admin)
router.post('/:id/officer-approve', rbacMiddleware('viewusers'), quotationController.officerApprove);

// POST /api/quotation/:id/vendor-accept - Vendor accepts quotation offer (Vendor only)
router.post('/:id/vendor-accept', quotationController.vendorAccept);

export default router;
