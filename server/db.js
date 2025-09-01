const { Pool } = require('pg');

const pool = new Pool({
  user: 'uptime_user',
  host: 'localhost',
  database: 'uptime_checker',
  password: 'password',
  port: 5432,
});

module.exports = pool;