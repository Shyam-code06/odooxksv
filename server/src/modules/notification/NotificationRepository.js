import BaseRepository from '../../common/BaseRepository.js';

export default class NotificationRepository extends BaseRepository {
  constructor() {
    super('notification', [
      'id',
      'userid',
      'type',
      'message',
      'isread',
      'createdat'
    ]);
  }

  async findByUserId(userId, limit = 50) {
    const sql = `
      SELECT * FROM "${this.tableName}" 
      WHERE userid = $1 
      ORDER BY createdat DESC 
      LIMIT $2
    `;
    const result = await this.executeQuery(sql, [userId, limit]);
    return result.rows;
  }

  async getUnreadCount(userId) {
    const sql = `
      SELECT COUNT(*)::int FROM "${this.tableName}" 
      WHERE userid = $1 AND isread = FALSE
    `;
    const result = await this.executeQuery(sql, [userId]);
    return parseInt(result.rows[0].count, 10);
  }

  async markAsRead(id) {
    const sql = `
      UPDATE "${this.tableName}" 
      SET isread = TRUE 
      WHERE id = $1 
      RETURNING *
    `;
    const result = await this.executeQuery(sql, [id]);
    return result.rows[0];
  }
}
