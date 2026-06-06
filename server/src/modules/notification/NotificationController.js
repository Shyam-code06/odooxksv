import BaseController from '../../common/BaseController.js';
import NotificationService from './NotificationService.js';

const notificationService = new NotificationService();

export default class NotificationController extends BaseController {
  constructor() {
    super(notificationService);
  }

  getMyNotifications = async (req, res, next) => {
    try {
      const data = await notificationService.getUserNotifications(req.user.id);
      return this.sendSuccess(res, data, 'Notifications fetched successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  markRead = async (req, res, next) => {
    try {
      const { id } = req.params;
      const data = await notificationService.markAsRead(id, req.user.id);
      return this.sendSuccess(res, data, 'Notification marked as read', 200);
    } catch (error) {
      next(error);
    }
  };
}
