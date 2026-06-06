import { ForbiddenError } from '../utils/customErrors.js';

/**
 * Middleware to enforce permissions based on RBAC rules.
 * @param {string} requiredPermission - The name of the permission required to access the route
 */
export default function rbacMiddleware(requiredPermission) {
  return (req, res, next) => {
    try {
      // 1. Ensure user is authenticated
      if (!req.user || !Array.isArray(req.user.permissions)) {
        throw new ForbiddenError('Access denied. No permissions found.');
      }

      // 2. Check if the user has the required permission
      const hasPermission = req.user.permissions.includes(requiredPermission);

      if (!hasPermission) {
        throw new ForbiddenError(`Access denied. You do not have permission to '${requiredPermission}'.`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
