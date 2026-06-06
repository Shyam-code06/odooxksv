import pool from '../../config/db.js';

export default class DashboardService {
  async getDashboardStats() {
    // 1. Total users
    const totalUsersResult = await pool.query('SELECT COUNT(*)::int FROM "user"');
    const totalUsers = totalUsersResult.rows[0].count;

    // 2. Active users
    const activeUsersResult = await pool.query('SELECT COUNT(*)::int FROM "user" WHERE isactive = true');
    const activeUsers = activeUsersResult.rows[0].count;

    // 3. Total activity logs
    const totalLogsResult = await pool.query('SELECT COUNT(*)::int FROM "auditlog"');
    const totalLogs = totalLogsResult.rows[0].count;

    // 4. Active sessions
    const activeSessionsResult = await pool.query(
      'SELECT COUNT(*)::int FROM "session" WHERE isrevoked = false AND expiresat > NOW()'
    );
    const activeSessions = activeSessionsResult.rows[0].count;

    // 5. User role distribution (using roles and users from database)
    const roleStatsResult = await pool.query(`
      SELECT 
        r.name AS rolename, 
        COUNT(u.id)::int AS count, 
        COALESCE(ROUND(COUNT(u.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM "user"), 0), 1), 0)::float AS percentage
      FROM "role" r
      LEFT JOIN "user" u ON u.roleid = r.id
      GROUP BY r.id, r.name
      ORDER BY count DESC, r.name ASC
    `);
    const roleStats = roleStatsResult.rows;

    // 6. Recent activity logs (last 5 logs)
    const recentLogsResult = await pool.query(`
      SELECT 
        al.id, 
        al.createdat, 
        al.action, 
        al.module, 
        u.username, 
        u.firstname, 
        u.lastname
      FROM "auditlog" al
      LEFT JOIN "user" u ON al.userid = u.id
      ORDER BY al.createdat DESC
      LIMIT 5
    `);
    const recentLogs = recentLogsResult.rows;

    return {
      stats: {
        totalUsers,
        activeUsers,
        totalLogs,
        activeSessions
      },
      roleStats,
      recentLogs
    };
  }
}
