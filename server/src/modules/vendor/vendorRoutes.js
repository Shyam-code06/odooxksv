import express from 'express';
import VendorController from './VendorController.js';
import authMiddleware from '../../middleware/authMiddleware.js';
import rbacMiddleware from '../../middleware/rbacMiddleware.js';

const router = express.Router();
const vendorController = new VendorController();

// Apply authentication middleware
router.use(authMiddleware);

// GET /api/vendor - Fetch, paginate, search, and filter vendors
router.get('/', rbacMiddleware('viewusers'), vendorController.getAll);

// GET /api/vendor/:id - Get single vendor details
router.get('/:id', rbacMiddleware('viewusers'), vendorController.getById);

// PUT /api/vendor/:id - Update vendor details or status
router.put('/:id', rbacMiddleware('editusers'), vendorController.update);

// DELETE /api/vendor/:id - Soft-delete or delete vendor record
router.delete('/:id', rbacMiddleware('editusers'), vendorController.delete);

export default router;
