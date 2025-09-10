require('dotenv').config();
const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

/*
const pool = mysql.createPool({
    host: process.env.DB_HOST_ALT,
    port: process.env.DB_PORT_ALT,
    user: process.env.DB_USER_ALT,
    password: process.env.DB_PASSWORD_ALT,
    database: process.env.DB_NAME_ALT
});
*/

// Export the pool for use in other files
module.exports = pool;
