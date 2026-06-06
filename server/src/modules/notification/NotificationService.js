import BaseService from '../../common/BaseService.js';
import NotificationRepository from './NotificationRepository.js';

const notificationRepo = new NotificationRepository();

export default class NotificationService extends BaseService {
  constructor() {
    super(notificationRepo);
  }

  async getUserNotifications(userId) {
    const notifications = await notificationRepo.findByUserId(userId);
    const unreadCount = await notificationRepo.getUnreadCount(userId);
    return { notifications, unreadCount };
  }

  async markAsRead(id, userId) {
    const notification = await notificationRepo.findById(id);
    if (!notification) {
      throw { status: 404, message: 'Notification not found' };
    }
    if (notification.userid !== userId) {
      throw { status: 403, message: 'Unauthorized' };
    }
    return notificationRepo.markAsRead(id);
  }

  async createNotification(userId, type, message) {
    return notificationRepo.create({
      userid: userId,
      type,
      message,
      isread: false
    });
  }
}
