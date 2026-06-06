import BaseService from '../../common/BaseService.js';
import InvoiceRepository from './InvoiceRepository.js';
import pool from '../../config/db.js';
import { AppError, NotFoundError } from '../../utils/customErrors.js';

const invoiceRepository = new InvoiceRepository();

export default class InvoiceService extends BaseService {
  constructor() {
    super(invoiceRepository);
  }

  /**
   * Create an invoice from an existing Purchase Order
   */
  async createInvoiceFromPO(poId) {
    // 1. Fetch Purchase Order and its items
    const poRes = await pool.query('SELECT * FROM purchaseorder WHERE id = $1', [poId]);
    const po = poRes.rows[0];
    if (!po) {
      throw new NotFoundError(`Purchase Order with ID ${poId} not found.`);
    }

    // Check if invoice already exists for this PO
    const existingRes = await pool.query('SELECT id FROM invoice WHERE purchaseorderid = $1', [poId]);
    if (existingRes.rows.length > 0) {
      throw new AppError('An invoice has already been generated for this Purchase Order.', 400);
    }

    // 2. Generate Invoice Number
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${year}${month}${day}-${random}`;

    // 3. Set Due Date (30 days from now)
    const duedate = new Date();
    duedate.setDate(duedate.getDate() + 30);

    // 4. Fetch PO items
    const poItemsRes = await pool.query('SELECT * FROM purchaseorderitem WHERE purchaseorderid = $1', [poId]);
    const poItems = poItemsRes.rows;

    const invoiceItems = [];
    let subtotal = 0;
    let taxamount = 0;

    if (poItems.length > 0) {
      for (const item of poItems) {
        const itemQty = parseInt(item.quantity, 10);
        const itemPrice = parseFloat(item.unitprice);
        const itemSub = itemQty * itemPrice;
        const itemTax = parseFloat((itemSub * 0.18).toFixed(2)); // GST 18%
        const itemTotal = parseFloat((itemSub + itemTax).toFixed(2));

        subtotal += itemSub;
        taxamount += itemTax;

        invoiceItems.push({
          itemname: item.itemname,
          quantity: itemQty,
          unitprice: itemPrice,
          taxrate: 18.00,
          taxamount: itemTax,
          totalprice: itemTotal
        });
      }
    } else {
      // Fallback if PO has no items
      const poSub = parseFloat(po.subtotal);
      const poTax = parseFloat(po.taxamount);
      subtotal = poSub;
      taxamount = poTax;

      invoiceItems.push({
        itemname: 'Procured Items Delivery',
        quantity: 1,
        unitprice: poSub,
        taxrate: 18.00,
        taxamount: poTax,
        totalprice: poSub + poTax
      });
    }

    const totalamount = parseFloat((subtotal + taxamount).toFixed(2));

    const invoiceData = {
      invoicenumber: invoiceNumber,
      purchaseorderid: poId,
      subtotal,
      taxamount,
      totalamount,
      status: 'Unpaid',
      duedate
    };

    // 5. Create invoice and items
    return this.repository.createWithItems(invoiceData, invoiceItems);
  }

  /**
   * Overridden findById to include items and details
   */
  async findById(id) {
    const detail = await this.repository.findDetail(id);
    if (!detail) {
      throw new NotFoundError(`Invoice with ID ${id} not found.`);
    }
    return detail;
  }

  /**
   * Overridden findAll with Invoice search columns
   */
  async findAll(options = {}) {
    const searchColumns = ['invoicenumber'];
    return this.repository.findAll({
      ...options,
      searchColumns
    });
  }
}
