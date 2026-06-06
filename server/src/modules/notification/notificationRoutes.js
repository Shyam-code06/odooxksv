import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';

import NotificationController from './NotificationController.js';

const router = express.Router();
const notificationController = new NotificationController();

// Apply authentication middleware
router.use(authMiddleware);

// GET /api/notification - Get notifications list
router.get('/', notificationController.getMyNotifications);

// PUT /api/notification/:id/read - Mark notification as read
router.put('/:id/read', notificationController.markRead);

export default router;
