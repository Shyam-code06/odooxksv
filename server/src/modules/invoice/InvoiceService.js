import BaseService from '../../common/BaseService.js';
import InvoiceRepository from './InvoiceRepository.js';
import pool from '../../config/db.js';
import { AppError, NotFoundError } from '../../utils/customErrors.js';
import { sendEmail } from '../../utils/mailer.js';

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

    // Check if PO is Completed
    if (po.status !== 'Completed') {
      throw new AppError('An invoice can only be generated for a Completed Purchase Order.', 400);
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
    const createdInvoice = await this.repository.createWithItems(invoiceData, invoiceItems);

    // 6. Fetch Vendor details and send email
    try {
      const vendorRes = await pool.query('SELECT * FROM vendor WHERE id = $1', [po.vendorid]);
      const vendor = vendorRes.rows[0];

      if (vendor && vendor.email) {
        const subject = `New Invoice Generated: ${invoiceNumber} (PO: ${po.ponumber})`;
        const text = `Dear ${vendor.companyname},\n\nNew invoice ${invoiceNumber} has been generated for Purchase Order ${po.ponumber}.\n\nTotal Amount: $${totalamount.toLocaleString()}\nDue Date: ${new Date(duedate).toLocaleDateString()}\n\nThank you,\nVendorBridge ERP`;
        
        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #faf5f1; color: #292f36; padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e0dbd8; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; }
    .header { background-color: #292f36; padding: 30px; color: #ffffff; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .content { padding: 30px; }
    .invoice-card { background: #faf5f1; border-radius: 8px; border: 1px solid #e0dbd8; padding: 20px; margin-bottom: 25px; }
    .invoice-card table { width: 100%; border-collapse: collapse; }
    .invoice-card td { padding: 6px 0; }
    .invoice-card td.label { font-weight: 600; color: #8f7a6e; }
    .invoice-card td.val { text-align: right; font-weight: 700; color: #292f36; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    .items-table th { background: #f8fafc; border-bottom: 2px solid #e0dbd8; padding: 10px; font-weight: 600; text-align: left; }
    .items-table td { border-bottom: 1px solid #e0dbd8; padding: 12px 10px; }
    .items-table td.num { text-align: right; }
    .footer { background: #faf5f1; border-top: 1px solid #e0dbd8; padding: 20px; text-align: center; font-size: 13px; color: #8f7a6e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>VendorBridge ERP</h1>
      <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">Automated Invoice Dispatch</p>
    </div>
    <div class="content">
      <p>Dear <strong>${vendor.companyname}</strong>,</p>
      <p>We are pleased to inform you that a new invoice has been generated for your Purchase Order reference <strong>${po.ponumber}</strong>.</p>
      
      <div class="invoice-card">
        <table>
          <tr>
            <td class="label">Invoice Number</td>
            <td class="val">${invoiceNumber}</td>
          </tr>
          <tr>
            <td class="label">PO Reference</td>
            <td class="val">${po.ponumber}</td>
          </tr>
          <tr>
            <td class="label">Due Date</td>
            <td class="val">${new Date(duedate).toLocaleDateString()}</td>
          </tr>
          <tr style="border-top: 1px solid #e0dbd8;">
            <td class="label" style="padding-top: 12px; font-size: 16px;">Total Amount</td>
            <td class="val" style="padding-top: 12px; font-size: 18px; color: #10b981;">$${totalamount.toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <h3 style="border-bottom: 2px solid #292f36; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px;">Invoice Line Items</h3>
      <table class="items-table">
        <thead>
          <tr>
            <th>Item Name</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceItems.map(item => `
            <tr>
              <td><strong>${item.itemname}</strong></td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">$${parseFloat(item.unitprice).toLocaleString()}</td>
              <td style="text-align: right;">$${parseFloat(item.totalprice).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <p style="font-size: 13px; color: #8f7a6e; line-height: 1.5; margin-bottom: 0;">
        Payment terms are NET 30 Days. Please ensure payment is processed on or before the due date. For any billing queries, contact our finance department.
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0 0 5px 0;">This is an automated notification from VendorBridge ERP system.</p>
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} VendorBridge. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `;

        await sendEmail({ to: vendor.email, subject, text, html });
      }
    } catch (emailError) {
      console.error('Invoice generated but failed to send email to vendor:', emailError.message);
    }

    return createdInvoice;
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
    const searchColumns = ['invoicenumber', 'ponumber', 'companyname'];
    return this.repository.findAll({
      ...options,
      searchColumns
    });
  }
}
