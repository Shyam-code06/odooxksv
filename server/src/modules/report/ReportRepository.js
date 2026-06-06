import pool from '../../config/db.js';

export default class ReportRepository {
  async getSpendingSummary() {
    // Group POs by month and status
    const sql = `
      SELECT 
        TO_CHAR(createdat, 'YYYY-MM') as month,
        SUM(totalamount) as total_spend
      FROM purchaseorder
      WHERE status IN ('Issued', 'Completed')
      GROUP BY TO_CHAR(createdat, 'YYYY-MM')
      ORDER BY month ASC
    `;
    const result = await pool.query(sql);
    return result.rows;
  }

  async getVendorPerformance() {
    // Get average rating and counts
    const sql = `
      SELECT 
        v.companyname, 
        v.rating,
        (SELECT COUNT(*) FROM purchaseorder po WHERE po.vendorid = v.id) as total_pos,
        (SELECT COALESCE(SUM(totalamount), 0) FROM purchaseorder po WHERE po.vendorid = v.id AND po.status IN ('Issued', 'Completed')) as total_spend
      FROM vendor v
      WHERE v.status = 'Approved'
      ORDER BY v.rating DESC, total_spend DESC
    `;
    const result = await pool.query(sql);
    return result.rows;
  }
}
