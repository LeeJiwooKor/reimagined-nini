const db = require('../config/db');

async function all(){
  const [rows] = await db.query('SELECT * FROM assets ORDER BY id DESC');
  return rows;
}
async function get(id){
  const [rows] = await db.query('SELECT * FROM assets WHERE id = ?', [id]);
  return rows[0];
}
async function create(obj){
  const [r] = await db.query(
    'INSERT INTO assets (name, category, purchase_date, purchase_price, current_value, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [obj.name, obj.category, obj.purchase_date || null, obj.purchase_price || 0, obj.current_value || 0, obj.notes || null]
  );
  return r.insertId;
}
async function update(id, obj){
  await db.query(
    'UPDATE assets SET name=?, category=?, purchase_date=?, purchase_price=?, current_value=?, notes=? WHERE id=?',
    [obj.name, obj.category, obj.purchase_date || null, obj.purchase_price || 0, obj.current_value || 0, obj.notes || null, id]
  );
}
async function remove(id){
  await db.query('DELETE FROM assets WHERE id=?', [id]);
}
module.exports = { all, get, create, update, remove };
