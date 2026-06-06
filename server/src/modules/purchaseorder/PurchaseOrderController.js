import BaseController from '../../common/BaseController.js';
import PurchaseOrderService from './PurchaseOrderService.js';
import pool from '../../config/db.js';

const poService = new PurchaseOrderService();

export default class PurchaseOrderController extends BaseController {
  constructor() {
    super(poService);
    this.getAll = this.getAll.bind(this);
    this.generatePO = this.generatePO.bind(this);
  }

  async getAll(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdat',
        sortOrder = 'DESC',
        search = '',
        ...restFilters
      } = req.query;

      // Vendors can only see their own purchase orders
      if (req.user.rolename === 'Vendor') {
        restFilters.vendorid = req.user.vendorid;
      }

      const result = await this.service.findAll({
        page,
        limit,
        sortBy,
        sortOrder,
        search,
        filters: restFilters,
      });

      return this.sendSuccess(
        res,
        result.records,
        'Purchase Orders retrieved successfully',
        200,
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  }

  async generatePO(req, res, next) {
    try {
      const { quotationId } = req.body;
      if (!quotationId) {
        return res.status(400).json({ success: false, message: 'quotationId is required' });
      }

      // Check if PO already exists for this quotation
      const existingRes = await pool.query(`
        SELECT p.id FROM purchaseorder p
        JOIN quotation q ON p.rfqid = q.rfqid AND p.vendorid = q.vendorid
        WHERE q.id = $1
      `, [quotationId]);
      
      if (existingRes.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'A Purchase Order already exists for this quotation.' });
      }

      const quoteRes = await pool.query('SELECT rfqid FROM quotation WHERE id = $1', [quotationId]);
      if (quoteRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Quotation not found' });
      }

      const rfqId = quoteRes.rows[0].rfqid;

      const record = await this.service.generatePOFromQuotation(quotationId, rfqId);
      return this.sendSuccess(res, record, 'Purchase Order generated successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}
