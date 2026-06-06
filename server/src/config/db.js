import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const poolConfig = {
  host: process.env.DBHOST || 'localhost',
  port: parseInt(process.env.DBPORT || '5432', 10),
  user: process.env.DBUSER || 'postgres',
  password: process.env.DBPASSWORD || 'postgres',
  database: process.env.DBNAME || 'vendorbridge',
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait when connecting before timing out
};

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export const query = (text, params) => pool.query(text, params);

export default pool;
