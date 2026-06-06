import express from 'express';
import UserController from './UserController.js';
import authMiddleware from '../../middleware/authMiddleware.js';
import rbacMiddleware from '../../middleware/rbacMiddleware.js';
import { ForbiddenError } from '../../utils/customErrors.js';

const router = express.Router();
const userController = new UserController();

// Apply authMiddleware to all user routes
router.use(authMiddleware);

// POST /api/user - Create user with role-specific RBAC check
router.post(
  '/',
  (req, res, next) => {
    const { roleid } = req.body;
    
    // Prevent privilege escalation
    if (roleid === 'd1b0337c-f230-4e1b-ae23-1d07b46ee334') {
      return next(new ForbiddenError('Privilege escalation blocked. Cannot create admin accounts.'));
    }
    
    // Check role-based permission
    if (roleid === '4a1f13f1-d5d1-4cb5-827d-0d6bc9f00df9' && !req.user.permissions.includes('createmanager')) {
      return next(new ForbiddenError('You do not have permission to create Manager accounts.'));
    }
    
    if (roleid === 'e46a7be7-a9a3-41fa-8a8b-3e5e4071ecbd' && !req.user.permissions.includes('createprocurementofficer')) {
      return next(new ForbiddenError('You do not have permission to create Procurement Officer accounts.'));
    }

    next();
  },
  userController.create
);

// GET /api/user - List users
router.get('/', rbacMiddleware('viewusers'), userController.getAll);

// GET /api/user/:id - Get single user
router.get('/:id', rbacMiddleware('viewusers'), userController.getById);

// PUT /api/user/:id - Update user details
router.put('/:id', rbacMiddleware('editusers'), userController.update);

// PATCH /api/user/:id/status - Toggle active/inactive status
router.patch(
  '/:id/status',
  (req, res, next) => {
    const { isactive } = req.body;
    const requiredPermission = isactive ? 'activateuser' : 'deactivateuser';
    
    if (!req.user.permissions.includes(requiredPermission)) {
      return next(new ForbiddenError(`You do not have permission to ${isactive ? 'activate' : 'deactivate'} users.`));
    }
    next();
  },
  userController.toggleStatus
);

// POST /api/user/:id/resetpassword - Reset user password
router.post('/:id/resetpassword', rbacMiddleware('resetuserpassword'), userController.resetPassword);

export default router;
