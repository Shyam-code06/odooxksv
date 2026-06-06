import BaseRepository from '../../common/BaseRepository.js';
import pool from '../../config/db.js';

export default class InvoiceRepository extends BaseRepository {
  constructor() {
    super('invoice', [
      'id',
      'invoicenumber',
      'purchaseorderid',
      'subtotal',
      'taxamount',
      'totalamount',
      'status',
      'duedate',
      'createdat',
      'updatedat'
    ]);
  }

  /**
   * Create invoice and copy items in a transaction
   */
  async createWithItems(invoiceData, items) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Create invoice row
      const invKeys = Object.keys(invoiceData).filter(key => this.isColumnAllowed(key));
      const columns = invKeys.join(', ');
      const placeholders = invKeys.map((_, idx) => `$${idx + 1}`).join(', ');
      const values = invKeys.map(key => invoiceData[key]);

      const invSql = `INSERT INTO "${this.tableName}" (${columns}) VALUES (${placeholders}) RETURNING *`;
      const invRes = await client.query(invSql, values);
      const invoice = invRes.rows[0];

      // 2. Insert invoice items
      const createdItems = [];
      if (items && items.length > 0) {
        for (const item of items) {
          const itemSql = `
            INSERT INTO invoiceitem (invoiceid, itemname, quantity, unitprice, taxrate, taxamount, totalprice)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `;
          const itemRes = await client.query(itemSql, [
            invoice.id,
            item.itemname,
            item.quantity,
            item.unitprice,
            item.taxrate || 18.00,
            item.taxamount,
            item.totalprice
          ]);
          createdItems.push(itemRes.rows[0]);
        }
      }

      await client.query('COMMIT');
      return {
        ...invoice,
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
   * List all invoices, joining PO and Vendor details
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

    // Filter by vendor ID if vendor logs in (joins via PO)
    let joinVendorSql = 'JOIN purchaseorder po ON inv.purchaseorderid = po.id JOIN vendor v ON po.vendorid = v.id';
    if (filters.vendorid) {
      whereClauses.push(`po.vendorid = $${paramCounter}`);
      values.push(filters.vendorid);
      paramCounter++;
      delete filters.vendorid;
    }

    for (const [key, val] of Object.entries(filters)) {
      if (this.isColumnAllowed(key) && val !== undefined && val !== null && val !== '') {
        whereClauses.push(`inv."${key}" = $${paramCounter}`);
        values.push(val);
        paramCounter++;
      }
    }

    if (search && searchColumns.length > 0) {
      const searchClauses = [];
      const sanitizedSearchColumns = searchColumns.filter(col => this.isColumnAllowed(col) || col === 'companyname' || col === 'ponumber');
      
      if (sanitizedSearchColumns.length > 0) {
        for (const col of sanitizedSearchColumns) {
          if (col === 'companyname') {
            searchClauses.push(`v."companyname" ILIKE $${paramCounter}`);
          } else if (col === 'ponumber') {
            searchClauses.push(`po."ponumber" ILIKE $${paramCounter}`);
          } else {
            searchClauses.push(`inv."${col}" ILIKE $${paramCounter}`);
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
      FROM "${this.tableName}" inv
      JOIN purchaseorder po ON inv.purchaseorderid = po.id
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
      SELECT inv.*, po.ponumber, v.companyname 
      FROM "${this.tableName}" inv
      ${joinVendorSql}
      ${whereSql} 
      ORDER BY inv."${safeSortBy}" ${safeSortOrder} 
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
   * Retrieve single invoice detail with items, PO details, and Vendor info
   */
  async findDetail(id) {
    const invSql = `
      SELECT inv.*, po.ponumber, v.companyname, v.email as vendoremail, v.phone as vendorphone, v.address as vendoraddress
      FROM "${this.tableName}" inv
      JOIN purchaseorder po ON inv.purchaseorderid = po.id
      JOIN vendor v ON po.vendorid = v.id
      WHERE inv.id = $1
    `;
    const invRes = await this.executeQuery(invSql, [id]);
    const invoice = invRes.rows[0];
    if (!invoice) return null;

    const itemsSql = 'SELECT * FROM invoiceitem WHERE invoiceid = $1';
    const itemsRes = await this.executeQuery(itemsSql, [id]);

    return {
      ...invoice,
      items: itemsRes.rows
    };
  }
}
