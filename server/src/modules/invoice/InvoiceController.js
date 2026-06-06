import BaseController from '../../common/BaseController.js';
import InvoiceService from './InvoiceService.js';
import { AppError } from '../../utils/customErrors.js';

const invoiceService = new InvoiceService();

export default class InvoiceController extends BaseController {
  constructor() {
    super(invoiceService);
    this.create = this.create.bind(this);
    this.getAll = this.getAll.bind(this);
  }

  async create(req, res, next) {
    try {
      if (req.user.rolename !== 'ProcurementOfficer') {
        throw new AppError('Only Procurement Officers can generate invoices.', 403);
      }
      const { purchaseorderid } = req.body;
      const record = await this.service.createInvoiceFromPO(purchaseorderid);
      return this.sendSuccess(res, record, 'Invoice generated successfully', 201);
    } catch (error) {
      next(error);
    }
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

      // Vendors can only view invoices related to their own POs
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
        'Invoices retrieved successfully',
        200,
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  }
}
