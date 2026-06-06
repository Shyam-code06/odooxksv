import BaseController from '../../common/BaseController.js';
import AuditLogService from './AuditLogService.js';

const auditService = new AuditLogService();

export default class AuditLogController extends BaseController {
  constructor() {
    super(auditService);
  }
}
