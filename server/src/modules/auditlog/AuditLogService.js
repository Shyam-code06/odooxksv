import BaseService from '../../common/BaseService.js';
import AuditLogRepository from './AuditLogRepository.js';

const auditRepo = new AuditLogRepository();

export default class AuditLogService extends BaseService {
  constructor() {
    super(auditRepo);
  }
}
