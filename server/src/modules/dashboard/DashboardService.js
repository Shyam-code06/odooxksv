import pool from '../../config/db.js';

export default class DashboardService {
  async getDashboardStats(user) {
    const role = user?.rolename || 'Admin';

    if (role === 'Vendor') {
      const vendorId = user.vendorid;

      // 1. RFQs received count
      const rfqsReceivedResult = await pool.query(
        'SELECT COUNT(*)::int FROM rfqvendor WHERE vendorid = $1',
        [vendorId]
      );
      const rfqsReceived = rfqsReceivedResult.rows[0].count;

      // 2. Quotations submitted count
      const quotationsSubmittedResult = await pool.query(
        'SELECT COUNT(*)::int FROM quotation WHERE vendorid = $1',
        [vendorId]
      );
      const quotationsSubmitted = quotationsSubmittedResult.rows[0].count;

      // 3. Purchase orders count
      const purchaseOrdersResult = await pool.query(
        'SELECT COUNT(*)::int FROM purchaseorder WHERE vendorid = $1',
        [vendorId]
      );
      const purchaseOrdersCount = purchaseOrdersResult.rows[0].count;

      // 4. Recent RFQs
      const recentRfqsResult = await pool.query(`
        SELECT r.* 
        FROM rfqvendor rv 
        JOIN rfq r ON rv.rfqid = r.id 
        WHERE rv.vendorid = $1 
        ORDER BY rv.invitedat DESC 
        LIMIT 5
      `, [vendorId]);
      const recentRfqs = recentRfqsResult.rows;

      // 5. Recent Quotations
      const recentQuotationsResult = await pool.query(`
        SELECT q.*, r.title as rfqtitle 
        FROM quotation q 
        JOIN rfq r ON q.rfqid = r.id 
        WHERE q.vendorid = $1 
        ORDER BY q.createdat DESC 
        LIMIT 5
      `, [vendorId]);
      const recentQuotations = recentQuotationsResult.rows;

      // 6. Recent POs
      const recentPOsResult = await pool.query(
        'SELECT * FROM purchaseorder WHERE vendorid = $1 ORDER BY createdat DESC LIMIT 5',
        [vendorId]
      );
      const recentPOs = recentPOsResult.rows;

      return {
        role,
        stats: {
          rfqsReceived,
          quotationsSubmitted,
          purchaseOrdersCount
        },
        recentRfqs,
        recentQuotations,
        recentPOs
      };
    }

    if (role === 'ProcurementOfficer') {
      // 1. Active RFQs count
      const activeRfqsResult = await pool.query(
        "SELECT COUNT(*)::int FROM rfq WHERE status = 'Published'"
      );
      const activeRfqs = activeRfqsResult.rows[0].count;

      // 2. Pending quotations count
      const pendingQuotationsResult = await pool.query(
        "SELECT COUNT(*)::int FROM quotation WHERE status = 'Submitted'"
      );
      const pendingQuotations = pendingQuotationsResult.rows[0].count;

      // 3. Purchase orders count
      const purchaseOrdersResult = await pool.query(
        'SELECT COUNT(*)::int FROM purchaseorder'
      );
      const purchaseOrdersCount = purchaseOrdersResult.rows[0].count;

      // 4. Recent RFQs
      const recentRfqsResult = await pool.query(
        'SELECT * FROM rfq ORDER BY createdat DESC LIMIT 5'
      );
      const recentRfqs = recentRfqsResult.rows;

      // 5. Recent POs
      const recentPOsResult = await pool.query(`
        SELECT po.*, v.companyname 
        FROM purchaseorder po 
        JOIN vendor v ON po.vendorid = v.id 
        ORDER BY po.createdat DESC 
        LIMIT 5
      `);
      const recentPOs = recentPOsResult.rows;

      return {
        role,
        stats: {
          activeRfqs,
          pendingQuotations,
          purchaseOrdersCount
        },
        recentRfqs,
        recentPOs
      };
    }

    if (role === 'Manager') {
      // 1. Pending approval steps count
      const pendingApprovalsResult = await pool.query(
        "SELECT COUNT(*)::int FROM approvalstep WHERE approverid = $1 AND status = 'Pending'",
        [user.id]
      );
      const pendingApprovals = pendingApprovalsResult.rows[0].count;

      // 2. Completed approvals count
      const completedApprovalsResult = await pool.query(
        "SELECT COUNT(*)::int FROM approvalstep WHERE approverid = $1 AND status != 'Pending'",
        [user.id]
      );
      const completedApprovals = completedApprovalsResult.rows[0].count;

      // 3. Recent Pending Steps
      const recentPendingStepsResult = await pool.query(`
        SELECT s.*, w.type as workflowtype, w.targetid 
        FROM approvalstep s 
        JOIN approvalworkflow w ON s.workflowid = w.id 
        WHERE s.approverid = $1 AND s.status = 'Pending' 
        ORDER BY s.createdat DESC 
        LIMIT 5
      `, [user.id]);
      const recentPendingSteps = recentPendingStepsResult.rows;

      // 4. Recent History Steps
      const recentHistoryStepsResult = await pool.query(`
        SELECT s.*, w.type as workflowtype, w.targetid 
        FROM approvalstep s 
        JOIN approvalworkflow w ON s.workflowid = w.id 
        WHERE s.approverid = $1 AND s.status != 'Pending' 
        ORDER BY s.decidedat DESC 
        LIMIT 5
      `, [user.id]);
      const recentHistorySteps = recentHistoryStepsResult.rows;

      return {
        role,
        stats: {
          pendingApprovals,
          completedApprovals
        },
        recentPendingSteps,
        recentHistorySteps
      };
    }

    // Default: Admin
    // 1. Total vendors
    const totalVendorsResult = await pool.query('SELECT COUNT(*)::int FROM vendor');
    const totalVendors = totalVendorsResult.rows[0].count;

    // 2. Total RFQs
    const totalRfqsResult = await pool.query('SELECT COUNT(*)::int FROM rfq');
    const totalRfqs = totalRfqsResult.rows[0].count;

    // 3. Pending approvals
    const pendingApprovalsResult = await pool.query(
      "SELECT COUNT(*)::int FROM approvalworkflow WHERE status = 'Pending'"
    );
    const pendingApprovals = pendingApprovalsResult.rows[0].count;

    // 4. Total Spend
    const totalSpendResult = await pool.query(
      "SELECT COALESCE(SUM(totalamount), 0)::float FROM purchaseorder WHERE status IN ('Issued', 'Completed')"
    );
    const totalSpend = totalSpendResult.rows[0].sum;

    // 5. User role distribution
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
      role,
      stats: {
        totalVendors,
        totalRfqs,
        pendingApprovals,
        totalSpend
      },
      roleStats,
      recentLogs
    };
  }
}
