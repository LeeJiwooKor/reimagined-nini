const db = require('../config/db');

async function all(){
  const [rows] = await db.query('SELECT * FROM accounts ORDER BY id DESC');
  return rows;
}
async function get(id){
  const [rows] = await db.query('SELECT * FROM accounts WHERE id = ?', [id]);
  return rows[0];
}
async function create(obj){
  const [r] = await db.query('INSERT INTO accounts (name,type,balance,currency) VALUES (?, ?, ?, ?)', [obj.name, obj.type, obj.balance||0, obj.currency||'KRW']);
  return r.insertId;
}
async function update(id, obj){
  await db.query('UPDATE accounts SET name=?, type=?, balance=?, currency=? WHERE id=?', [obj.name, obj.type, obj.balance||0, obj.currency||'KRW', id]);
}
async function remove(id){
  await db.query('DELETE FROM accounts WHERE id=?', [id]);
}
module.exports = { all, get, create, update, remove };
