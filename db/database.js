/**
 * Name: Ziyad Abdelhamid
 * Date: 11.19.2026
 * CSC 372: Configure PostgreSQL and initialize the schema and seed data.
 */
let { Pool } = require('pg');
let { readFile } = require('node:fs/promises');
let path = require('node:path');
require('dotenv').config({ quiet: true });

/**
 * Create a connection pool using the private environment configuration.
 * @returns {import('pg').Pool} PostgreSQL pool.
 */
function createPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Set DATABASE_URL in .env before starting the app.');
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000
  });
}

/**
 * Initialize both tables and seed records in one transaction.
 * @param {import('pg').Pool} pool - Database pool.
 * @returns {Promise<void>} Resolves when initialization finishes.
 */
async function initializeDatabase(pool) {
  let client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(await readFile(path.join(__dirname, 'schema.sql'), 'utf8'));
    await client.query(await readFile(path.join(__dirname, 'seed.sql'), 'utf8'));
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { createPool, initializeDatabase };
