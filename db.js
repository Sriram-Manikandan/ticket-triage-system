// Database connection. The connection string comes from the environment, never from code.
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // NeonDB requires SSL
});

module.exports = pool;
