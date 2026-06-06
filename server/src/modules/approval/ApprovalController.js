import BaseController from '../../common/BaseController.js';
import ApprovalService from './ApprovalService.js';
import AuditLogRepository from '../auditlog/AuditLogRepository.js';
import { AppError } from '../../utils/customErrors.js';

const approvalService = new ApprovalService();
const auditRepo = new AuditLogRepository();

export default class ApprovalController extends BaseController {
  constructor() {
    super(approvalService);
    this.submit = this.submit.bind(this);
    this.decide = this.decide.bind(this);
    this.getPending = this.getPending.bind(this);
    this.getHistory = this.getHistory.bind(this);
  }

  async submit(req, res, next) {
    try {
      const { rfqId, quotationId, approverId } = req.body;
      const record = await this.service.submitForApproval({ rfqId, quotationId, approverId });
      await auditRepo.logEvent({ userid: req.user.id, action: 'submit_approval', module: 'approval', newvalue: { rfqId, quotationId, approverId } });
      return this.sendSuccess(res, record, 'Quotation successfully submitted for Manager approval.', 201);
    } catch (error) {
      next(error);
    }
  }

  async decide(req, res, next) {
    try {
      if (req.user.rolename !== 'Manager' && req.user.rolename !== 'Admin') {
        throw new AppError('Only Manager or Admin can process approval decisions.', 403);
      }

      const { id } = req.params;
      const { status, remarks } = req.body;
      const result = await this.service.decide(id, { status, remarks });
      await auditRepo.logEvent({ userid: req.user.id, action: `decide_${status.toLowerCase()}`, module: 'approval', newvalue: { stepId: id, status, remarks } });
      return this.sendSuccess(res, result, `Approval step ${status.toLowerCase()} successfully`);
    } catch (error) {
      next(error);
    }
  }

  async getPending(req, res, next) {
    try {
      if (req.user.rolename !== 'Manager' && req.user.rolename !== 'Admin') {
        throw new AppError('Only Manager or Admin can view pending approval workflows.', 403);
      }

      const records = await this.service.getPending(req.user.id);
      return this.sendSuccess(res, records, 'Pending decisions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      if (req.user.rolename !== 'Manager' && req.user.rolename !== 'Admin') {
        throw new AppError('Only Manager or Admin can view approval history.', 403);
      }

      const records = await this.service.getHistory(req.user.id);
      return this.sendSuccess(res, records, 'Approval history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
