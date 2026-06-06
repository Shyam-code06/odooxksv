import BaseController from '../../common/BaseController.js';
import QuotationService from './QuotationService.js';
import ApprovalService from '../approval/ApprovalService.js';
import AuditLogRepository from '../auditlog/AuditLogRepository.js';
import { AppError } from '../../utils/customErrors.js';

const quotationService = new QuotationService();
const approvalService = new ApprovalService();
const auditRepo = new AuditLogRepository();

export default class QuotationController extends BaseController {
  constructor() {
    super(quotationService);
    this.submit = this.submit.bind(this);
    this.compare = this.compare.bind(this);
    this.getAll = this.getAll.bind(this);
  }

  async submit(req, res, next) {
    try {
      // Must be a Vendor user
      if (req.user.rolename !== 'Vendor') {
        throw new AppError('Only registered vendors can submit quotations.', 403);
      }

      if (!req.user.vendorid) {
        throw new AppError('User profile is not associated with any vendor record.', 400);
      }

      const record = await this.service.submitQuotation(req.body, req.user.vendorid);
      await auditRepo.logEvent({ userid: req.user.id, action: 'submit', module: 'quotation', newvalue: { rfqId: req.body.rfqid, totalprice: req.body.totalprice } });
      return this.sendSuccess(res, record, 'Quotation submitted successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async compare(req, res, next) {
    try {
      const { rfqId } = req.params;
      const data = await this.service.compareQuotations(rfqId);
      return this.sendSuccess(res, data, 'Quotation comparison report generated');
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

      // Restrict vendors to only view their own quotations
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
        'Quotations retrieved successfully',
        200,
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  }
}
