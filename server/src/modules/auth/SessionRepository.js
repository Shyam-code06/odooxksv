import BaseRepository from '../../common/BaseRepository.js';

export default class SessionRepository extends BaseRepository {
  constructor() {
    super('session', [
      'id',
      'userid',
      'refreshtoken',
      'expiresat',
      'createdat',
      'isrevoked'
    ]);
  }

  /**
   * Find a session by refresh token
   */
  async findByRefreshToken(token) {
    return this.findOneBy('refreshtoken', token);
  }

  /**
   * Revoke a refresh token (mark as revoked)
   */
  async revokeRefreshToken(token) {
    const sql = `
      UPDATE "${this.tableName}" 
      SET isrevoked = TRUE 
      WHERE refreshtoken = $1 
      RETURNING *
    `;
    const result = await this.executeQuery(sql, [token]);
    return result.rows[0] || null;
  }

  /**
   * Revoke all sessions for a specific user (force logout everywhere)
   */
  async revokeUserSessions(userid) {
    const sql = `
      UPDATE "${this.tableName}" 
      SET isrevoked = TRUE 
      WHERE userid = $1 
      RETURNING *
    `;
    const result = await this.executeQuery(sql, [userid]);
    return result.rows;
  }
}
