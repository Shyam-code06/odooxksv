import BaseService from '../../common/BaseService.js';
import NotificationRepository from './NotificationRepository.js';
import pool from '../../config/db.js';

const notificationRepo = new NotificationRepository();

export default class NotificationService extends BaseService {
  constructor() {
    super(notificationRepo);
  }

  /**
   * Broadcast a notification to all active users having specific role names
   */
  async broadcastToRoles(roles, type, message) {
    try {
      const rolesList = Array.isArray(roles) ? roles : [roles];
      const userRes = await pool.query(`
        SELECT u.id 
        FROM "user" u
        JOIN role r ON u.roleid = r.id
        WHERE r.name = ANY($1) AND u.isactive = TRUE
      `, [rolesList]);

      const users = userRes.rows;
      for (const user of users) {
        await this.createNotification(user.id, type, message);
      }
    } catch (err) {
      console.error('Failed to broadcast notifications to roles:', err.message);
    }
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
