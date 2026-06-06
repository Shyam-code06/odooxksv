import BaseService from '../../common/BaseService.js';
import ApprovalRepository from './ApprovalRepository.js';
import pool from '../../config/db.js';
import { AppError, NotFoundError } from '../../utils/customErrors.js';
import PurchaseOrderService from '../purchaseorder/PurchaseOrderService.js';

const approvalRepository = new ApprovalRepository();
const poService = new PurchaseOrderService();

export default class ApprovalService extends BaseService {
  constructor() {
    super(approvalRepository);
  }

  /**
   * Submit an RFQ quotation for Manager approval
   */
  async submitForApproval({ rfqId, quotationId, approverId }) {
    // 1. Check if RFQ exists
    const rfqRes = await pool.query('SELECT * FROM rfq WHERE id = $1', [rfqId]);
    const rfq = rfqRes.rows[0];
    if (!rfq) {
      throw new NotFoundError(`RFQ with ID ${rfqId} not found.`);
    }

    // 2. Check if Quotation exists and belongs to RFQ
    const quoteRes = await pool.query('SELECT * FROM quotation WHERE id = $1 AND rfqid = $2', [quotationId, rfqId]);
    const quotation = quoteRes.rows[0];
    if (!quotation) {
      throw new NotFoundError(`Quotation with ID ${quotationId} not found for this RFQ.`);
    }

    // 3. Find Manager if not specified
    let targetApproverId = approverId;
    if (!targetApproverId) {
      const managerRes = await pool.query(`
        SELECT u.id 
        FROM "user" u 
        JOIN role r ON u.roleid = r.id 
        WHERE r.name = 'Manager' AND u.isactive = TRUE 
        LIMIT 1
      `);
      if (managerRes.rows.length === 0) {
        throw new AppError('No active Manager account found to assign this approval to.', 400);
      }
      targetApproverId = managerRes.rows[0].id;
    }

    // 4. Create approval workflow in evaluation phase
    const result = await this.repository.createWorkflowWithStep('RFQ', rfqId, targetApproverId);

    // 5. Update statuses
    await pool.query("UPDATE rfq SET status = 'Under Evaluation' WHERE id = $1", [rfqId]);
    await pool.query("UPDATE quotation SET status = 'Reviewed' WHERE id = $1", [quotationId]);

    return result;
  }

  /**
   * Submit an RFQ draft for Manager approval to publish
   */
  async submitRfqForPublishApproval({ rfqId, approverId }) {
    // 1. Check if RFQ exists
    const rfqRes = await pool.query('SELECT * FROM rfq WHERE id = $1', [rfqId]);
    const rfq = rfqRes.rows[0];
    if (!rfq) {
      throw new NotFoundError(`RFQ with ID ${rfqId} not found.`);
    }

    if (rfq.status !== 'Draft') {
      throw new AppError(`RFQ must be in Draft state to request publish approval. Current status is ${rfq.status}`, 400);
    }

    // 2. Find Manager if not specified
    let targetApproverId = approverId;
    if (!targetApproverId) {
      const managerRes = await pool.query(`
        SELECT u.id 
        FROM "user" u 
        JOIN role r ON u.roleid = r.id 
        WHERE r.name = 'Manager' AND u.isactive = TRUE 
        LIMIT 1
      `);
      if (managerRes.rows.length === 0) {
        throw new AppError('No active Manager account found to assign this approval to.', 400);
      }
      targetApproverId = managerRes.rows[0].id;
    }

    // 3. Create approval workflow
    const result = await this.repository.createWorkflowWithStep('RFQ_Publish', rfqId, targetApproverId);

    // 4. Update RFQ status
    await pool.query("UPDATE rfq SET status = 'Pending Approval', updatedat = CURRENT_TIMESTAMP WHERE id = $1", [rfqId]);

    return result;
  }

  /**
   * Process manager decision (Approve / Reject)
   */
  async decide(stepId, { status, remarks }) {
    if (!['Approved', 'Rejected'].includes(status)) {
      throw new AppError('Status must be Approved or Rejected.', 400);
    }

    const { step, workflow } = await this.repository.decideStep(stepId, status, remarks);

    const rfqId = workflow.targetid;

    // Handle workflow type 'RFQ_Publish'
    if (workflow.type === 'RFQ_Publish') {
      if (status === 'Approved') {
        await pool.query("UPDATE rfq SET status = 'Published', updatedat = CURRENT_TIMESTAMP WHERE id = $1", [rfqId]);
      } else {
        await pool.query("UPDATE rfq SET status = 'Rejected', updatedat = CURRENT_TIMESTAMP WHERE id = $1", [rfqId]);
      }
    }

    // Handle workflow type 'RFQ' (Quotation Evaluation)
    else if (workflow.type === 'RFQ') {
      if (status === 'Approved') {
        // Complete RFQ
        await pool.query("UPDATE rfq SET status = 'Completed', updatedat = CURRENT_TIMESTAMP WHERE id = $1", [rfqId]);
        
        // Find the reviewed quotation
        const quoteRes = await pool.query("SELECT * FROM quotation WHERE rfqid = $1 AND status = 'Reviewed'", [rfqId]);
        const acceptedQuotation = quoteRes.rows[0];
        
        if (acceptedQuotation) {
          // Accept this quotation
          await pool.query("UPDATE quotation SET status = 'Accepted', updatedat = CURRENT_TIMESTAMP WHERE id = $1", [acceptedQuotation.id]);
          
          // Reject other quotations for this RFQ
          await pool.query(
            "UPDATE quotation SET status = 'Rejected', updatedat = CURRENT_TIMESTAMP WHERE rfqid = $1 AND id != $2",
            [rfqId, acceptedQuotation.id]
          );

          // Removed Auto-generate Purchase Order, now handled manually by Procurement Officer
        }
      } else {
        // Rejected workflow
        await pool.query("UPDATE rfq SET status = 'Closed', updatedat = CURRENT_TIMESTAMP WHERE id = $1", [rfqId]);
        await pool.query("UPDATE quotation SET status = 'Rejected', updatedat = CURRENT_TIMESTAMP WHERE rfqid = $1 AND status = 'Reviewed'", [rfqId]);
      }
    }

    return { step, workflow };
  }

  /**
   * Fetch pending approval decisions for a manager
   */
  async getPending(managerId) {
    return this.repository.getPendingStepsForManager(managerId);
  }

  /**
   * Fetch decided approval history for a manager
   */
  async getHistory(managerId) {
    return this.repository.getHistoryStepsForManager(managerId);
  }
}
