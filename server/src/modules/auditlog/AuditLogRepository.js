import BaseRepository from '../../common/BaseRepository.js';

export default class AuditLogRepository extends BaseRepository {
  constructor() {
    super('auditlog', [
      'id',
      'userid',
      'action',
      'module',
      'oldvalue',
      'newvalue',
      'createdat'
    ]);
  }

  async logEvent({ userid, action, module, oldvalue = null, newvalue = null }) {
    const formattedOld = oldvalue ? JSON.stringify(oldvalue) : null;
    const formattedNew = newvalue ? JSON.stringify(newvalue) : null;

    return this.create({
      userid,
      action,
      module,
      oldvalue: formattedOld,
      newvalue: formattedNew
    });
  }

  async findAll({
    page = 1,
    limit = 10,
    sortBy = 'createdat',
    sortOrder = 'DESC',
    filters = {},
    search = ''
  } = {}) {
    const values = [];
    let paramCounter = 1;
    let whereClauses = [];

    for (const [key, val] of Object.entries(filters)) {
      if (this.isColumnAllowed(key) && val !== undefined && val !== null && val !== '') {
        whereClauses.push(`al."${key}" = $${paramCounter}`);
        values.push(val);
        paramCounter++;
      }
    }

    if (search) {
      whereClauses.push(`(al.action ILIKE $${paramCounter} OR al.module ILIKE $${paramCounter} OR u.username ILIKE $${paramCounter})`);
      values.push(`%${search}%`);
      paramCounter++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) 
      FROM "${this.tableName}" al 
      JOIN "user" u ON al.userid = u.id 
      JOIN "role" r ON u.roleid = r.id AND r.name IN ('Manager', 'ProcurementOfficer')
      ${whereSql}
    `;
    const countResult = await this.executeQuery(countSql, values);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    const safeSortBy = this.isColumnAllowed(sortBy) ? `al."${sortBy}"` : 'al.createdat';
    const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    const safeLimit = parseInt(limit, 10) || 10;
    const safeOffset = (parseInt(page, 10) - 1) * safeLimit;

    const dataValues = [...values];
    const limitPlaceholder = `$${paramCounter}`;
    const offsetPlaceholder = `$${paramCounter + 1}`;
    dataValues.push(safeLimit);
    dataValues.push(safeOffset);

    const dataSql = `
      SELECT al.*, u.username, u.firstname, u.lastname
      FROM "${this.tableName}" al
      JOIN "user" u ON al.userid = u.id
      JOIN "role" r ON u.roleid = r.id AND r.name IN ('Manager', 'ProcurementOfficer')
      ${whereSql} 
      ORDER BY ${safeSortBy} ${safeSortOrder} 
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const dataResult = await this.executeQuery(dataSql, dataValues);
    const totalPages = Math.ceil(totalRecords / safeLimit);

    return {
      records: dataResult.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: safeLimit,
        totalRecords,
        totalPages
      }
    };
  }
}
