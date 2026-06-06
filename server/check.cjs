require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DBUSER || 'postgres',
  host: process.env.DBHOST || 'localhost',
  database: process.env.DBNAME || 'vendorbridge',
  password: process.env.DBPASSWORD || 'postgres',
  port: parseInt(process.env.DBPORT || '5432', 10),
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT r.name as rolename, p.name as permissionname 
      FROM role r 
      JOIN rolepermission rp ON r.id = rp.roleid 
      JOIN permission p ON rp.permissionid = p.id
      ORDER BY r.name, p.name
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
