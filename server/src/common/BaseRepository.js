import pool from '../config/db.js';

export default class BaseRepository {
  constructor(tableName, allowedColumns = []) {
    if (!tableName) {
      throw new Error('Table name must be specified in BaseRepository subclass.');
    }
    // Strict lowercase singular constraint
    this.tableName = tableName.toLowerCase();
    this.allowedColumns = allowedColumns.map(col => col.toLowerCase());
  }

  /**
   * Helper to run queries safely with PostgreSQL Pool
   */
  async executeQuery(text, params = []) {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Validate column names to prevent SQL injection in dynamic queries
   */
  isColumnAllowed(column) {
    return this.allowedColumns.includes(column.toLowerCase());
  }

  /**
   * Create a new record
   */
  async create(data) {
    const keys = Object.keys(data).filter(key => this.isColumnAllowed(key));
    if (keys.length === 0) {
      throw new Error('No valid columns provided for insert.');
    }

    const columns = keys.join(', ');
    const valuePlaceholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const values = keys.map(key => data[key]);

    const sql = `INSERT INTO "${this.tableName}" (${columns}) VALUES (${valuePlaceholders}) RETURNING *`;
    const result = await this.executeQuery(sql, values);
    return result.rows[0];
  }

  /**
   * Find a single record by UUID id
   */
  async findById(id) {
    const sql = `SELECT * FROM "${this.tableName}" WHERE id = $1`;
    const result = await this.executeQuery(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find a single record by a key-value pair
   */
  async findOneBy(column, value) {
    if (!this.isColumnAllowed(column)) {
      throw new Error(`Column ${column} is not allowed.`);
    }

    const sql = `SELECT * FROM "${this.tableName}" WHERE "${column.toLowerCase()}" = $1`;
    const result = await this.executeQuery(sql, [value]);
    return result.rows[0] || null;
  }

  /**
   * Update an existing record by id
   */
  async update(id, data) {
    const keys = Object.keys(data).filter(key => this.isColumnAllowed(key) && data[key] !== undefined);
    if (keys.length === 0) {
      throw new Error('No valid columns provided for update.');
    }

    const setClauses = keys.map((key, index) => `"${key}" = $${index + 2}`).join(', ');
    const values = [id, ...keys.map(key => data[key])];

    const sql = `UPDATE "${this.tableName}" SET ${setClauses}, updatedat = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
    const result = await this.executeQuery(sql, values);
    return result.rows[0] || null;
  }

  /**
   * Delete a record by id
   */
  async delete(id) {
    const sql = `DELETE FROM "${this.tableName}" WHERE id = $1 RETURNING *`;
    const result = await this.executeQuery(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find all records with Pagination, Filtering, Search, and Sorting
   * @param {Object} options
   * @param {number} options.page - Page number (1-indexed)
   * @param {number} options.limit - Number of records per page
   * @param {string} options.sortBy - Column name to sort by
   * @param {string} options.sortOrder - ASC or DESC
   * @param {Object} options.filters - Key-value exact matches
   * @param {string} options.search - General search term
   * @param {Array<string>} options.searchColumns - Columns to perform LIKE search against
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

    // We copy values for data query since count and data share where clauses
    const dataValues = [...values];
    
    // Add pagination params
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
