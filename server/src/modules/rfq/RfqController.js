import BaseController from '../../common/BaseController.js';
import RfqService from './RfqService.js';
import ApprovalService from '../approval/ApprovalService.js';
import AuditLogRepository from '../auditlog/AuditLogRepository.js';

const rfqService = new RfqService();
const approvalService = new ApprovalService();
const auditRepo = new AuditLogRepository();

export default class RfqController extends BaseController {
  constructor() {
    super(rfqService);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.publish = this.publish.bind(this);
    this.requestApproval = this.requestApproval.bind(this);
    this.close = this.close.bind(this);
    this.getAll = this.getAll.bind(this);
  }

  async create(req, res, next) {
    try {
      const record = await this.service.create(req.body, req.user.id);
      await auditRepo.logEvent({ userid: req.user.id, action: 'create', module: 'rfq', newvalue: { rfqnumber: record.rfqnumber, title: record.title } });
      return this.sendSuccess(res, record, 'RFQ created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const record = await this.service.update(id, req.body);
      await auditRepo.logEvent({ userid: req.user.id, action: 'update', module: 'rfq', newvalue: { rfqId: id, updates: req.body } });
      return this.sendSuccess(res, record, 'RFQ updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async publish(req, res, next) {
    try {
      const { id } = req.params;
      const record = await this.service.publish(id);
      await auditRepo.logEvent({ userid: req.user.id, action: 'publish', module: 'rfq', newvalue: { rfqId: id } });
      return this.sendSuccess(res, record, 'RFQ published successfully. Invited vendors can now submit quotations.');
    } catch (error) {
      next(error);
    }
  }

  async requestApproval(req, res, next) {
    try {
      const { id } = req.params;
      const result = await approvalService.submitRfqForPublishApproval({ rfqId: id });
      await auditRepo.logEvent({ userid: req.user.id, action: 'request_approval', module: 'rfq', newvalue: { rfqId: id } });
      return this.sendSuccess(res, result, 'RFQ approval requested successfully.');
    } catch (error) {
      next(error);
    }
  }

  async close(req, res, next) {
    try {
      const { id } = req.params;
      const record = await this.service.close(id);
      await auditRepo.logEvent({ userid: req.user.id, action: 'close', module: 'rfq', newvalue: { rfqId: id } });
      return this.sendSuccess(res, record, 'RFQ closed successfully.');
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

      // If user is a Vendor, restrict filter to only their vendor ID
      if (req.user.rolename === 'Vendor') {
        restFilters.vendorid = req.user.vendorid;
        // Vendors should only see Published RFQs
        restFilters.status = 'Published';
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
        'RFQs retrieved successfully',
        200,
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  }
}
