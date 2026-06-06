import BaseService from '../../common/BaseService.js';
import PurchaseOrderRepository from './PurchaseOrderRepository.js';
import pool from '../../config/db.js';
import { NotFoundError } from '../../utils/customErrors.js';

const poRepository = new PurchaseOrderRepository();

export default class PurchaseOrderService extends BaseService {
  constructor() {
    super(poRepository);
  }

  /**
   * Override update to handle associated invoice transition on completion
   */
  async update(id, data) {
    const record = await super.update(id, data);
    if (data.status === 'Completed') {
      await pool.query(
        "UPDATE invoice SET status = 'Paid', updatedat = CURRENT_TIMESTAMP WHERE purchaseorderid = $1",
        [id]
      );
    }
    return record;
  }

  /**
   * Auto-generate a Purchase Order from an accepted quotation
   */
  async generatePOFromQuotation(quotationId, rfqId) {
    // 1. Fetch Quotation and details
    const quoteRes = await pool.query('SELECT * FROM quotation WHERE id = $1', [quotationId]);
    const quotation = quoteRes.rows[0];
    if (!quotation) {
      throw new NotFoundError(`Quotation with ID ${quotationId} not found.`);
    }

    // 2. Fetch RFQ
    const rfqRes = await pool.query('SELECT * FROM rfq WHERE id = $1', [rfqId]);
    const rfq = rfqRes.rows[0];

    // 3. Generate PO Number
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    const poNumber = `PO-${year}${month}${day}-${random}`;

    // 4. Calculate amounts
    const subtotal = parseFloat(quotation.totalprice);
    const taxamount = parseFloat((subtotal * 0.18).toFixed(2)); // GST 18% standard
    const totalamount = parseFloat((subtotal + taxamount).toFixed(2));

    const poData = {
      ponumber: poNumber,
      rfqid: rfqId,
      vendorid: quotation.vendorid,
      subtotal,
      taxamount,
      totalamount,
      status: 'Issued'
    };

    // 5. Fetch quotation items if any, otherwise build a fallback item
    const quoteItemsRes = await pool.query('SELECT * FROM quotationitem WHERE quotationid = $1', [quotationId]);
    const quoteItems = quoteItemsRes.rows;

    const poItems = [];
    if (quoteItems.length > 0) {
      for (const qi of quoteItems) {
        poItems.push({
          itemname: qi.itemname,
          quantity: qi.quantity,
          unit: qi.unit,
          unitprice: parseFloat(qi.unitprice),
          totalprice: parseFloat(qi.totalprice)
        });
      }
    } else {
      // Fallback to RFQ summary fields if quotation items are not specified
      poItems.push({
        itemname: rfq ? rfq.title : 'Procured Items',
        quantity: rfq ? rfq.quantity : 1,
        unit: rfq ? rfq.unit : 'Units',
        unitprice: subtotal / (rfq ? rfq.quantity : 1),
        totalprice: subtotal
      });
    }

    // 6. Insert PO and items via transaction
    const newPO = await this.repository.createWithItems(poData, poItems);
    return newPO;
  }

  /**
   * Overridden findById to fetch line items
   */
  async findById(id) {
    const detail = await this.repository.findDetail(id);
    if (!detail) {
      throw new NotFoundError(`Purchase Order with ID ${id} not found.`);
    }
    return detail;
  }

  /**
   * Overridden findAll with PO search columns
   */
  async findAll(options = {}) {
    const searchColumns = ['ponumber', 'companyname'];
    return this.repository.findAll({
      ...options,
      searchColumns
    });
  }
}
