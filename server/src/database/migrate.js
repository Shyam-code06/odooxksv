import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDatabaseExists() {
  const dbName = process.env.DBNAME || 'vendorbridge';
  
  // Temporary pool to connect to the default 'postgres' database
  const tempPool = new pg.Pool({
    host: process.env.DBHOST || 'localhost',
    port: parseInt(process.env.DBPORT || '5432', 10),
    user: process.env.DBUSER || 'postgres',
    password: process.env.DBPASSWORD || 'postgres',
    database: 'postgres', // connect to default administrative database
  });

  const client = await tempPool.connect();
  try {
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
      console.log(`Database "${dbName}" does not exist. Creating...`);
      // Double quote the identifier to handle any reserved names safely
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (error) {
    console.error('Error verifying/creating database:', error.message);
    throw error;
  } finally {
    client.release();
    await tempPool.end();
  }
}

async function migrate() {
  try {
    // 1. Ensure the database exists before running schema migrations
    await ensureDatabaseExists();

    // 2. Connect to the target database and run schema/seed
    const client = await pool.connect();
    try {
      console.log('Database Migration Started...');

      // Read and run schema.sql
      const schemaPath = path.join(__dirname, 'schema.sql');
      console.log(`Reading schema from: ${schemaPath}`);
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      
      console.log('Executing schema.sql...');
      await client.query('BEGIN');
      await client.query(schemaSql);
      await client.query('COMMIT');
      console.log('Schema setup completed successfully.');

      // Read and run seed.sql
      const seedPath = path.join(__dirname, 'seed.sql');
      console.log(`Reading seed data from: ${seedPath}`);
      const seedSql = fs.readFileSync(seedPath, 'utf8');

      console.log('Executing seed.sql...');
      await client.query('BEGIN');
      await client.query(seedSql);
      await client.query('COMMIT');
      console.log('Seeding completed successfully.');

      console.log('Database Migration & Seeding Finished Successfully!');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Migration failed:', error);
      process.exit(1);
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('Fatal initialization error:', error.message);
    process.exit(1);
  }
}

migrate();
