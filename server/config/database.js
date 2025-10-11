const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool = null;

const getPool = async () => {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      console.log('✓ Connected to Azure SQL Database');

      pool.on('error', err => {
        console.error('SQL Pool Error:', err);
        pool = null;
      });
    } catch (err) {
      console.error('✗ Database connection failed:', err.message);
      throw err;
    }
  }
  return pool;
};

const testConnection = async () => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT GETDATE() as CurrentTime, @@VERSION as Version');
    console.log('✓ Database connection test successful');
    console.log('✓ Current time:', result.recordset[0].CurrentTime);
  } catch (err) {
    console.error('✗ Database connection test failed:', err.message);
    console.error('Please check your database configuration in .env file');
    process.exit(1);
  }
};

testConnection();

module.exports = {
  getPool,
  sql
};
