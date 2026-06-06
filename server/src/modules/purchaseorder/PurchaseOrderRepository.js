import BaseRepository from '../../common/BaseRepository.js';
import pool from '../../config/db.js';

export default class PurchaseOrderRepository extends BaseRepository {
  constructor() {
    super('purchaseorder', [
      'id',
      'ponumber',
      'rfqid',
      'vendorid',
      'subtotal',
      'taxamount',
      'totalamount',
      'status',
      'createdat',
      'updatedat',
      'deletedat'
    ]);
  }

  /**
   * Create PO with items inside a transaction
   */
  async createWithItems(poData, items) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert PO row
      const poKeys = Object.keys(poData).filter(key => this.isColumnAllowed(key));
      const columns = poKeys.join(', ');
      const placeholders = poKeys.map((_, idx) => `$${idx + 1}`).join(', ');
      const values = poKeys.map(key => poData[key]);

      const poSql = `INSERT INTO "${this.tableName}" (${columns}) VALUES (${placeholders}) RETURNING *`;
      const poRes = await client.query(poSql, values);
      const po = poRes.rows[0];

      // 2. Insert PO items
      const createdItems = [];
      if (items && items.length > 0) {
        for (const item of items) {
          const itemSql = `
            INSERT INTO purchaseorderitem (purchaseorderid, itemname, quantity, unit, unitprice, totalprice)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          const itemRes = await client.query(itemSql, [
            po.id,
            item.itemname,
            item.quantity,
            item.unit,
            item.unitprice,
            item.totalprice
          ]);
          createdItems.push(itemRes.rows[0]);
        }
      }

      await client.query('COMMIT');
      return {
        ...po,
        items: createdItems
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Overridden findAll supporting joining vendor company name
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

    for (const [key, val] of Object.entries(filters)) {
      if (this.isColumnAllowed(key) && val !== undefined && val !== null && val !== '') {
        whereClauses.push(`po."${key}" = $${paramCounter}`);
        values.push(val);
        paramCounter++;
      }
    }

    if (search && searchColumns.length > 0) {
      const searchClauses = [];
      const sanitizedSearchColumns = searchColumns.filter(col => this.isColumnAllowed(col) || col === 'companyname');
      
      if (sanitizedSearchColumns.length > 0) {
        for (const col of sanitizedSearchColumns) {
          if (col === 'companyname') {
            searchClauses.push(`v."companyname" ILIKE $${paramCounter}`);
          } else {
            searchClauses.push(`po."${col}" ILIKE $${paramCounter}`);
          }
        }
        whereClauses.push(`(${searchClauses.join(' OR ')})`);
        values.push(`%${search}%`);
        paramCounter++;
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) 
      FROM "${this.tableName}" po
      ${whereSql}
    `;
    const countResult = await this.executeQuery(countSql, values);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    const safeSortBy = this.isColumnAllowed(sortBy) ? sortBy : 'createdat';
    const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    const safeLimit = parseInt(limit, 10) || 10;
    const safeOffset = (parseInt(page, 10) - 1) * safeLimit;

    const dataValues = [...values];
    const limitPlaceholder = `$${paramCounter}`;
    const offsetPlaceholder = `$${paramCounter + 1}`;
    dataValues.push(safeLimit);
    dataValues.push(safeOffset);

    const dataSql = `
      SELECT po.*, v.companyname 
      FROM "${this.tableName}" po
      JOIN vendor v ON po.vendorid = v.id
      ${whereSql} 
      ORDER BY po."${safeSortBy}" ${safeSortOrder} 
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
   * Get single PO detail with line items
   */
  async findDetail(id) {
    const poSql = `
      SELECT po.*, v.companyname, v.email as vendoremail, v.phone as vendorphone, v.address as vendoraddress,
             (SELECT i.id FROM invoice i WHERE i.purchaseorderid = po.id LIMIT 1) as invoiceid
      FROM "${this.tableName}" po
      JOIN vendor v ON po.vendorid = v.id
      WHERE po.id = $1
    `;
    const poRes = await this.executeQuery(poSql, [id]);
    const po = poRes.rows[0];
    if (!po) return null;

    const itemsSql = 'SELECT * FROM purchaseorderitem WHERE purchaseorderid = $1';
    const itemsRes = await this.executeQuery(itemsSql, [id]);

    return {
      ...po,
      items: itemsRes.rows
    };
  }
}
