import BaseRepository from '../../common/BaseRepository.js';
import pool from '../../config/db.js';

export default class ApprovalRepository extends BaseRepository {
  constructor() {
    super('approvalworkflow', [
      'id',
      'type',
      'targetid',
      'status',
      'createdat',
      'updatedat'
    ]);
  }

  /**
   * Create workflow and step in a transaction
   */
  async createWorkflowWithStep(type, targetid, approverid) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Check if an active workflow already exists for this target
      const checkSql = 'SELECT * FROM approvalworkflow WHERE targetid = $1 AND status = \'Pending\'';
      const checkRes = await client.query(checkSql, [targetid]);
      if (checkRes.rows.length > 0) {
        throw new Error('An active approval workflow already exists for this record.');
      }

      // 2. Insert workflow
      const wfSql = `
        INSERT INTO approvalworkflow (type, targetid, status)
        VALUES ($1, $2, 'Pending')
        RETURNING *
      `;
      const wfRes = await client.query(wfSql, [type, targetid]);
      const workflow = wfRes.rows[0];

      // 3. Insert step
      const stepSql = `
        INSERT INTO approvalstep (workflowid, stepnumber, approverid, status)
        VALUES ($1, 1, $2, 'Pending')
        RETURNING *
      `;
      const stepRes = await client.query(stepSql, [workflow.id, approverid]);

      await client.query('COMMIT');
      return {
        workflow,
        step: stepRes.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Fetch pending approval decisions for a manager
   */
  async getPendingStepsForManager(managerId) {
    const sql = `
      SELECT 
        s.id as stepid, s.stepnumber, s.status as stepstatus, s.createdat as stepcreatedat,
        w.id as workflowid, w.type as workflowtype, w.targetid, w.status as workflowstatus,
        r.rfqnumber, r.title as rfqtitle, r.description as rfqdescription,
        u.firstname as requesterfirst, u.lastname as requesterlast
      FROM approvalstep s
      JOIN approvalworkflow w ON s.workflowid = w.id
      JOIN rfq r ON w.targetid = r.id
      LEFT JOIN "user" u ON r.createdby = u.id
      WHERE s.approverid = $1 AND s.status = 'Pending' AND w.status = 'Pending'
      ORDER BY s.createdat DESC
    `;
    const res = await this.executeQuery(sql, [managerId]);
    return res.rows;
  }

  /**
   * Fetch decided approval history for a manager
   */
  async getHistoryStepsForManager(managerId) {
    const sql = `
      SELECT 
        s.id as stepid, s.stepnumber, s.status as stepstatus, s.remarks, s.decidedat, s.createdat as stepcreatedat,
        w.id as workflowid, w.type as workflowtype, w.targetid, w.status as workflowstatus,
        r.rfqnumber, r.title as rfqtitle,
        u.firstname as requesterfirst, u.lastname as requesterlast
      FROM approvalstep s
      JOIN approvalworkflow w ON s.workflowid = w.id
      JOIN rfq r ON w.targetid = r.id
      LEFT JOIN "user" u ON r.createdby = u.id
      WHERE s.approverid = $1 AND s.status != 'Pending'
      ORDER BY s.decidedat DESC
    `;
    const res = await this.executeQuery(sql, [managerId]);
    return res.rows;
  }

  /**
   * Update step and workflow in a transaction
   */
  async decideStep(stepId, status, remarks) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Update step
      const stepSql = `
        UPDATE approvalstep 
        SET status = $1, remarks = $2, decidedat = CURRENT_TIMESTAMP 
        WHERE id = $3 
        RETURNING *
      `;
      const stepRes = await client.query(stepSql, [status, remarks, stepId]);
      const step = stepRes.rows[0];
      if (!step) {
        throw new Error('Approval step not found.');
      }

      // 2. Update workflow status
      const wfSql = `
        UPDATE approvalworkflow 
        SET status = $1, updatedat = CURRENT_TIMESTAMP 
        WHERE id = $2 
        RETURNING *
      `;
      const wfRes = await client.query(wfSql, [status, step.workflowid]);
      const workflow = wfRes.rows[0];

      await client.query('COMMIT');
      return { step, workflow };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
