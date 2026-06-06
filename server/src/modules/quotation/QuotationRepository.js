import BaseRepository from '../../common/BaseRepository.js';
import pool from '../../config/db.js';

export default class QuotationRepository extends BaseRepository {
  constructor() {
    super('quotation', [
      'id',
      'rfqid',
      'vendorid',
      'totalprice',
      'deliverydays',
      'notes',
      'attachmenturl',
      'status',
      'createdat',
      'updatedat'
    ]);
  }

  /**
   * Submit quotation with details and items in a single transaction
   */
  async createWithItems(quotationData, items) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Create main quotation record
      const quoteKeys = Object.keys(quotationData).filter(key => this.isColumnAllowed(key));
      const columns = quoteKeys.join(', ');
      const placeholders = quoteKeys.map((_, idx) => `$${idx + 1}`).join(', ');
      const values = quoteKeys.map(key => quotationData[key]);

      const quoteSql = `INSERT INTO "${this.tableName}" (${columns}) VALUES (${placeholders}) RETURNING *`;
      const quoteRes = await client.query(quoteSql, values);
      const quotation = quoteRes.rows[0];

      // 2. Insert items if they exist
      const createdItems = [];
      if (items && items.length > 0) {
        for (const item of items) {
          const itemSql = `
            INSERT INTO quotationitem (quotationid, itemname, quantity, unit, unitprice, totalprice)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          const itemRes = await client.query(itemSql, [
            quotation.id,
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
        ...quotation,
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
   * Get single quotation detail with line items
   */
  async findDetail(id) {
    const quoteSql = `
      SELECT q.*, v.companyname, v.rating as vendorrating, r.title as rfqtitle
      FROM "${this.tableName}" q
      JOIN vendor v ON q.vendorid = v.id
      JOIN rfq r ON q.rfqid = r.id
      WHERE q.id = $1
    `;
    const quoteRes = await this.executeQuery(quoteSql, [id]);
    const quotation = quoteRes.rows[0];
    if (!quotation) return null;

    const itemsSql = 'SELECT * FROM quotationitem WHERE quotationid = $1';
    const itemsRes = await this.executeQuery(itemsSql, [id]);

    return {
      ...quotation,
      items: itemsRes.rows
    };
  }

  /**
   * Get all quotations for comparison side-by-side
   */
  async getComparisonData(rfqId) {
    const sql = `
      SELECT q.*, v.companyname, v.rating as vendorrating, v.contactperson, v.phone, v.email
      FROM "${this.tableName}" q
      JOIN vendor v ON q.vendorid = v.id
      WHERE q.rfqid = $1
      ORDER BY q.totalprice ASC, q.deliverydays ASC
    `;
    const result = await this.executeQuery(sql, [rfqId]);
    return result.rows;
  }
}
