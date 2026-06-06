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
      'createdby',
      'updatedby',
      'createdat',
      'updatedat'
    ]);
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
