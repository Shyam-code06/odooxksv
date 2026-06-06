import pool from '../../config/db.js';

export default class DashboardService {
  async getDashboardStats(user) {
    const role = user?.rolename || 'Admin';

    if (role === 'Vendor') {
      const vendorId = user.vendorid;

      // 1. RFQs received count
      const rfqsReceivedResult = await pool.query(`
        SELECT COUNT(rv.rfqid)::int 
        FROM rfqvendor rv
        JOIN rfq r ON rv.rfqid = r.id
        WHERE rv.vendorid = $1 AND r.status NOT IN ('Draft', 'Pending Approval', 'Rejected')
      `, [vendorId]);
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
        WHERE rv.vendorid = $1 AND r.status NOT IN ('Draft', 'Pending Approval', 'Rejected')
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

      // 7. Recent Invoices
      const invoicesResult = await pool.query(`
        SELECT COUNT(i.id)::int 
        FROM invoice i 
        JOIN purchaseorder po ON i.purchaseorderid = po.id 
        WHERE po.vendorid = $1
      `, [vendorId]);
      const invoicesCount = invoicesResult.rows[0].count;

      const recentInvoicesResult = await pool.query(`
        SELECT i.*, po.ponumber, v.companyname 
        FROM invoice i 
        JOIN purchaseorder po ON i.purchaseorderid = po.id 
        JOIN vendor v ON po.vendorid = v.id 
        WHERE po.vendorid = $1 
        ORDER BY i.createdat DESC 
        LIMIT 5
      `, [vendorId]);
      const recentInvoices = recentInvoicesResult.rows;

      return {
        role,
        stats: {
          rfqsReceived,
          quotationsSubmitted,
          purchaseOrdersCount,
          invoicesCount
        },
        recentRfqs,
        recentQuotations,
        recentPOs,
        recentInvoices
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

      // 6. Recent Invoices
      const invoicesResult = await pool.query(
        'SELECT COUNT(*)::int FROM invoice'
      );
      const invoicesCount = invoicesResult.rows[0].count;

      const recentInvoicesResult = await pool.query(`
        SELECT i.*, po.ponumber, v.companyname 
        FROM invoice i 
        JOIN purchaseorder po ON i.purchaseorderid = po.id 
        JOIN vendor v ON po.vendorid = v.id 
        ORDER BY i.createdat DESC 
        LIMIT 5
      `);
      const recentInvoices = recentInvoicesResult.rows;

      return {
        role,
        stats: {
          activeRfqs,
          pendingQuotations,
          purchaseOrdersCount,
          invoicesCount
        },
        recentRfqs,
        recentPOs,
        recentInvoices
      };
    }

    if (role === 'Manager') {
      // 1. Pending approval steps count
      const pendingApprovalsResult = await pool.query(
        `SELECT COUNT(*)::int 
         FROM approvalstep s
         JOIN approvalworkflow w ON s.workflowid = w.id
         WHERE s.approverid = $1 AND s.status = 'Pending' AND w.status = 'Pending'
         AND (
           (w.type IN ('RFQ', 'RFQ_Publish') AND EXISTS (SELECT 1 FROM rfq WHERE id = w.targetid))
           OR
           (w.type = 'PurchaseOrder' AND EXISTS (SELECT 1 FROM purchaseorder WHERE id = w.targetid))
         )`,
        [user.id]
      );
      const pendingApprovals = pendingApprovalsResult.rows[0].count;

      // 2. Completed approvals count
      const completedApprovalsResult = await pool.query(
        `SELECT COUNT(*)::int 
         FROM approvalstep s
         JOIN approvalworkflow w ON s.workflowid = w.id
         WHERE s.approverid = $1 AND s.status != 'Pending'
         AND (
           (w.type IN ('RFQ', 'RFQ_Publish') AND EXISTS (SELECT 1 FROM rfq WHERE id = w.targetid))
           OR
           (w.type = 'PurchaseOrder' AND EXISTS (SELECT 1 FROM purchaseorder WHERE id = w.targetid))
         )`,
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

      const purchaseOrdersResult = await pool.query('SELECT COUNT(*)::int FROM purchaseorder');
      const purchaseOrdersCount = purchaseOrdersResult.rows[0].count;

      const invoicesResult = await pool.query('SELECT COUNT(*)::int FROM invoice');
      const invoicesCount = invoicesResult.rows[0].count;

      const recentPOsResult = await pool.query(`
        SELECT po.*, v.companyname 
        FROM purchaseorder po 
        JOIN vendor v ON po.vendorid = v.id 
        ORDER BY po.createdat DESC 
        LIMIT 5
      `);
      const recentPOs = recentPOsResult.rows;

      const recentInvoicesResult = await pool.query(`
        SELECT i.*, po.ponumber, v.companyname 
        FROM invoice i 
        JOIN purchaseorder po ON i.purchaseorderid = po.id 
        JOIN vendor v ON po.vendorid = v.id 
        ORDER BY i.createdat DESC 
        LIMIT 5
      `);
      const recentInvoices = recentInvoicesResult.rows;

      return {
        role,
        stats: {
          pendingApprovals,
          completedApprovals,
          purchaseOrdersCount,
          invoicesCount
        },
        recentPendingSteps,
        recentHistorySteps,
        recentPOs,
        recentInvoices
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
      "SELECT COALESCE(SUM(totalamount), 0)::float AS sum FROM purchaseorder WHERE status IN ('Issued', 'Completed')"
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

    // 6. Recent Registered Vendors (last 5 vendors)
    const recentVendorsResult = await pool.query(`
      SELECT id, companyname, category, email, status, createdat
      FROM vendor
      ORDER BY createdat DESC
      LIMIT 5
    `);
    const recentVendors = recentVendorsResult.rows;

    const purchaseOrdersResult = await pool.query('SELECT COUNT(*)::int FROM purchaseorder');
    const purchaseOrdersCount = purchaseOrdersResult.rows[0].count;

    const invoicesResult = await pool.query('SELECT COUNT(*)::int FROM invoice');
    const invoicesCount = invoicesResult.rows[0].count;

    const recentPOsResult = await pool.query(`
      SELECT po.*, v.companyname 
      FROM purchaseorder po 
      JOIN vendor v ON po.vendorid = v.id 
      ORDER BY po.createdat DESC 
      LIMIT 5
    `);
    const recentPOs = recentPOsResult.rows;

    const recentInvoicesResult = await pool.query(`
      SELECT i.*, po.ponumber, v.companyname 
      FROM invoice i 
      JOIN purchaseorder po ON i.purchaseorderid = po.id 
      JOIN vendor v ON po.vendorid = v.id 
      ORDER BY i.createdat DESC 
      LIMIT 5
    `);
    const recentInvoices = recentInvoicesResult.rows;

    return {
      role,
      stats: {
        totalVendors,
        totalRfqs,
        pendingApprovals,
        totalSpend,
        purchaseOrdersCount,
        invoicesCount
      },
      roleStats,
      recentVendors,
      recentPOs,
      recentInvoices
    };
  }
}
