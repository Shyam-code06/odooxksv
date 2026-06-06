import BaseRepository from '../../common/BaseRepository.js';

export default class UserRepository extends BaseRepository {
  constructor() {
    super('user', [
      'id',
      'firstname',
      'lastname',
      'email',
      'phonenumber',
      'username',
      'passwordhash',
      'roleid',
      'isactive',
      'vendorid',
      'createdby',
      'updatedby',
      'createdat',
      'updatedat'
    ]);
  }

  /**
   * Get all users, excluding those with the 'Vendor' role.
   */
  async findAll({
    page = 1,
    limit = 10,
    sortBy = 'createdat',
    sortOrder = 'DESC',
    filters = {},
    search = '',
    searchColumns = []
  } = {}) {
    const values = [];
    let paramCounter = 1;
    let whereClauses = [];

    // Always exclude Vendor role ID
    const vendorRoleId = 'b78e1b3d-71b5-4b08-b0a3-bf2e8964d4b3';
    whereClauses.push(`"roleid" != $${paramCounter}`);
    values.push(vendorRoleId);
    paramCounter++;

    // 1. Exact Match Filters
    for (const [key, val] of Object.entries(filters)) {
      if (this.isColumnAllowed(key) && val !== undefined && val !== null && val !== '') {
        whereClauses.push(`"${key}" = $${paramCounter}`);
        values.push(val);
        paramCounter++;
      }
    }

    // 2. Search Filter (LIKE matching)
    if (search && searchColumns.length > 0) {
      const searchClauses = [];
      const sanitizedSearchColumns = searchColumns.filter(col => this.isColumnAllowed(col));
      
      if (sanitizedSearchColumns.length > 0) {
        for (const col of sanitizedSearchColumns) {
          searchClauses.push(`"${col}" ILIKE $${paramCounter}`);
        }
        whereClauses.push(`(${searchClauses.join(' OR ')})`);
        values.push(`%${search}%`);
        paramCounter++;
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 3. Count Query
    const countSql = `SELECT COUNT(*) FROM "${this.tableName}" ${whereSql}`;
    const countResult = await this.executeQuery(countSql, values);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    // 4. Sorting
    const safeSortBy = this.isColumnAllowed(sortBy) ? sortBy : 'createdat';
    const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // 5. Pagination
    const safeLimit = parseInt(limit, 10) || 10;
    const safeOffset = (parseInt(page, 10) - 1) * safeLimit;

    const dataValues = [...values];
    const limitPlaceholder = `$${paramCounter}`;
    const offsetPlaceholder = `$${paramCounter + 1}`;
    dataValues.push(safeLimit);
    dataValues.push(safeOffset);

    // 6. Data Query
    const dataSql = `
      SELECT * FROM "${this.tableName}" 
      ${whereSql} 
      ORDER BY "${safeSortBy}" ${safeSortOrder} 
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const dataResult = await this.executeQuery(dataSql, dataValues);
    const totalPages = Math.ceil(totalRecords / safeLimit);

    // Security: strip passwordhash
    const records = dataResult.rows.map(({ passwordhash, ...safeUser }) => safeUser);

    return {
      records,
      pagination: {
        page: parseInt(page, 10),
        limit: safeLimit,
        totalRecords,
        totalPages
      }
    };
  }

  /**
   * Find user by username, joining the role table to get the role name.
   */
  async findByUsername(username) {
    const sql = `
      SELECT u.*, r.name as rolename 
      FROM "${this.tableName}" u 
      JOIN role r ON u.roleid = r.id 
      WHERE u.username = $1
    `;
    const result = await this.executeQuery(sql, [username]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email, joining the role table.
   */
  async findByEmail(email) {
    const sql = `
      SELECT u.*, r.name as rolename 
      FROM "${this.tableName}" u 
      JOIN role r ON u.roleid = r.id 
      WHERE u.email = $1
    `;
    const result = await this.executeQuery(sql, [email]);
    return result.rows[0] || null;
  }

  /**
   * Get all permission names associated with a role ID
   */
  async getUserPermissions(roleid) {
    const sql = `
      SELECT p.name 
      FROM permission p 
      JOIN rolepermission rp ON p.id = rp.permissionid 
      WHERE rp.roleid = $1
    `;
    const result = await this.executeQuery(sql, [roleid]);
    return result.rows.map(row => row.name);
  }
}
