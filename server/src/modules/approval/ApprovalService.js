import BaseService from '../../common/BaseService.js';
import ApprovalRepository from './ApprovalRepository.js';
import pool from '../../config/db.js';
import { AppError, NotFoundError } from '../../utils/customErrors.js';

import NotificationService from '../notification/NotificationService.js';
import PurchaseOrderService from '../purchaseorder/PurchaseOrderService.js';
import InvoiceService from '../invoice/InvoiceService.js';


const approvalRepository = new ApprovalRepository();



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

    // 5. Send notification to the manager
    try {
      const notificationService = new NotificationService();
      await notificationService.createNotification(
        targetApproverId,
        'RFQ Approval Request',
        `A new RFQ ${rfq.rfqnumber} ("${rfq.title}") is pending your publish approval.`
      );
    } catch (notifErr) {
      console.error('Failed to notify manager of RFQ approval request:', notifErr.message);
    }

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
      const rfqRes = await pool.query('SELECT createdby, rfqnumber, title FROM rfq WHERE id = $1', [rfqId]);
      const rfq = rfqRes.rows[0];
      const rfqNumber = rfq?.rfqnumber || 'Unknown';
      const createdBy = rfq?.createdby;
      const notificationService = new NotificationService();

      if (status === 'Approved') {
        await pool.query("UPDATE rfq SET status = 'Published', updatedat = CURRENT_TIMESTAMP WHERE id = $1", [rfqId]);
        
        // Broadcast notification to all Vendors, Managers, and Procurement Officers
        try {
          await notificationService.broadcastToRoles(
            ['Vendor', 'Manager', 'ProcurementOfficer'],
            'RFQ Published',
            `A new RFQ ${rfqNumber} ("${rfq?.title || ''}") has been published and is open for bidding.`
          );
        } catch (notifErr) {
          console.error('RFQ approved but failed to broadcast notifications:', notifErr.message);
        }

        // Direct notification to the creator (Procurement Officer)
        if (createdBy) {
          try {
            await notificationService.createNotification(
              createdBy,
              'RFQ Approved',
              `Your RFQ ${rfqNumber} ("${rfq?.title || ''}") has been approved and published.`
            );
          } catch (notifErr) {
            console.error('RFQ approved but failed to notify creator:', notifErr.message);
          }
        }
      } else {
        await pool.query("UPDATE rfq SET status = 'Rejected', updatedat = CURRENT_TIMESTAMP WHERE id = $1", [rfqId]);

        // Direct notification to the creator (Procurement Officer)
        if (createdBy) {
          try {
            await notificationService.createNotification(
              createdBy,
              'RFQ Rejected',
              `Your RFQ ${rfqNumber} ("${rfq?.title || ''}") has been rejected by the manager.`
            );
          } catch (notifErr) {
            console.error('RFQ rejected but failed to notify creator:', notifErr.message);
          }
        }
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

          // Auto-generate PO and Invoice
          try {
            const poService = new PurchaseOrderService();
            const invoiceService = new InvoiceService();

            // 1. Generate PO
            const generatedPO = await poService.generatePOFromQuotation(acceptedQuotation.id, rfqId);

            // 2. Set the PO status to 'Completed' to allow immediate invoice generation
            await pool.query("UPDATE purchaseorder SET status = 'Completed', updatedat = CURRENT_TIMESTAMP WHERE id = $1", [generatedPO.id]);

            // 3. Generate Invoice
            await invoiceService.createInvoiceFromPO(generatedPO.id);

            // 4. Set officerapproved = true and vendoraccepted = true on the quotation
            await pool.query(
              "UPDATE quotation SET officerapproved = true, vendoraccepted = true, updatedat = CURRENT_TIMESTAMP WHERE id = $1",
              [acceptedQuotation.id]
            );
          } catch (autoGenErr) {
            console.error('Error auto-generating PO and Invoice after manager approval:', autoGenErr.message);
          }
        }

        // Broadcast quotation approval notification to all Vendors, Managers, and Procurement Officers
        try {
          const rfqRes = await pool.query("SELECT rfqnumber, title FROM rfq WHERE id = $1", [rfqId]);
          const rfq = rfqRes.rows[0];
          const rfqNumber = rfq?.rfqnumber || 'Unknown';
          const notificationService = new NotificationService();
          await notificationService.broadcastToRoles(
            ['Vendor', 'Manager', 'ProcurementOfficer'],
            'Quotation Approved',
            `Quotation has been approved for RFQ ${rfqNumber} ("${rfq?.title || ''}").`
          );
        } catch (notifErr) {
          console.error('Quotation approved but failed to broadcast notifications:', notifErr.message);
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
