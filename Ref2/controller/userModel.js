const db = require('../config/db');

async function findByUsername(username){
  const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
  return rows[0];
}
async function findById(id){
  const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0];
}
async function createUser(username, hashedPassword, displayName='User'){
  const [r] = await db.query('INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)', [username, hashedPassword, displayName]);
  return r.insertId;
}
module.exports = { findByUsername, findById, createUser };
