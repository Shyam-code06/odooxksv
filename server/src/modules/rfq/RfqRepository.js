import BaseRepository from '../../common/BaseRepository.js';
import pool from '../../config/db.js';

export default class RfqRepository extends BaseRepository {
  constructor() {
    super('rfq', [
      'id',
      'rfqnumber',
      'title',
      'description',
      'category',
      'quantity',
      'unit',
      'deadline',
      'status',
      'createdby',
      'createdat',
      'updatedat',
      'deletedat'
    ]);
  }

  /**
   * Enhanced find all supporting vendor assignments filter
   */
  async findAll({
    page = 1,
    limit = 10,
    sortBy = 'createdat',
    sortOrder = 'DESC',
    filters = {},
    search = '',
    searchColumns = []
  } = {}) {
    const values = [];
    let paramCounter = 1;
    let whereClauses = [];
    let joinSql = '';

    // If filtered by vendorid, we join with rfqvendor bridge table
    if (filters.vendorid) {
      joinSql = 'JOIN rfqvendor rv ON t.id = rv.rfqid';
      whereClauses.push(`rv.vendorid = $${paramCounter}`);
      values.push(filters.vendorid);
      paramCounter++;
      delete filters.vendorid; // remove it so base logic doesn't treat it as exact match on rfq table
    }

    // Exact match filters on the table (supports arrays using ANY)
    for (const [key, val] of Object.entries(filters)) {
      if (this.isColumnAllowed(key) && val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
          whereClauses.push(`t."${key}" = ANY($${paramCounter})`);
          values.push(val);
        } else {
          whereClauses.push(`t."${key}" = $${paramCounter}`);
          values.push(val);
        }
        paramCounter++;
      }
    }

    // Search filter
    if (search && searchColumns.length > 0) {
      const searchClauses = [];
      const sanitizedSearchColumns = searchColumns.filter(col => this.isColumnAllowed(col));
      
      if (sanitizedSearchColumns.length > 0) {
        for (const col of sanitizedSearchColumns) {
          searchClauses.push(`t."${col}" ILIKE $${paramCounter}`);
        }
        whereClauses.push(`(${searchClauses.join(' OR ')})`);
        values.push(`%${search}%`);
        paramCounter++;
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count query
    const countSql = `
      SELECT COUNT(DISTINCT t.id) 
      FROM "${this.tableName}" t
      ${joinSql}
      ${whereSql}
    `;
    const countResult = await this.executeQuery(countSql, values);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    // Sorting
    const safeSortBy = this.isColumnAllowed(sortBy) ? sortBy : 'createdat';
    const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Pagination
    const safeLimit = parseInt(limit, 10) || 10;
    const safeOffset = (parseInt(page, 10) - 1) * safeLimit;

    const dataValues = [...values];
    const limitPlaceholder = `$${paramCounter}`;
    const offsetPlaceholder = `$${paramCounter + 1}`;
    dataValues.push(safeLimit);
    dataValues.push(safeOffset);

    // Data query
    const dataSql = `
      SELECT DISTINCT t.* 
      FROM "${this.tableName}" t
      ${joinSql}
      ${whereSql} 
      ORDER BY t."${safeSortBy}" ${safeSortOrder} 
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const dataResult = await this.executeQuery(dataSql, dataValues);
    const totalPages = Math.ceil(totalRecords / safeLimit);

    return {
      records: dataResult.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: safeLimit,
        totalRecords,
        totalPages
      }
    };
  }

  /**
   * Get detail including list of assigned vendors and quotations
   */
  async findDetail(id) {
    // 1. Get main RFQ info
    const rfqSql = `SELECT * FROM "${this.tableName}" WHERE id = $1`;
    const rfqRes = await this.executeQuery(rfqSql, [id]);
    const rfq = rfqRes.rows[0];
    if (!rfq) return null;

    // 2. Get assigned vendors details
    const vendorsSql = `
      SELECT v.* 
      FROM rfqvendor rv
      JOIN vendor v ON rv.vendorid = v.id
      WHERE rv.rfqid = $1
    `;
    const vendorsRes = await this.executeQuery(vendorsSql, [id]);

    // 3. Get quotations submitted
    const quotationsSql = `
      SELECT q.*, v.companyname, v.rating as vendorrating, po.id as purchaseorderid, po.ponumber
      FROM quotation q
      JOIN vendor v ON q.vendorid = v.id
      LEFT JOIN purchaseorder po ON q.rfqid = po.rfqid AND q.vendorid = po.vendorid
      WHERE q.rfqid = $1
      ORDER BY q.totalprice ASC
    `;
    const quotationsRes = await this.executeQuery(quotationsSql, [id]);

    return {
      ...rfq,
      assignedVendors: vendorsRes.rows,
      quotations: quotationsRes.rows
    };
  }

  /**
   * Assign vendor IDs to an RFQ in a transaction/batch
   */
  async assignVendors(rfqId, vendorIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete existing assignments first
      await client.query('DELETE FROM rfqvendor WHERE rfqid = $1', [rfqId]);

      if (vendorIds && vendorIds.length > 0) {
        for (const vendorId of vendorIds) {
          await client.query(
            'INSERT INTO rfqvendor (rfqid, vendorid) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [rfqId, vendorId]
          );
        }
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
