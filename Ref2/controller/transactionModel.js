const db = require('../config/db');

async function all(limit=200){
  const [rows] = await db.query(`SELECT t.*, a.name as account_name, asst.name as asset_name
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN assets asst ON t.asset_id = asst.id
    ORDER BY t.created_at DESC LIMIT ?`, [limit]);
  return rows;
}
async function get(id){
  const [rows] = await db.query('SELECT * FROM transactions WHERE id= ?', [id]);
  return rows[0];
}
async function create(obj){
  const [r] = await db.query('INSERT INTO transactions (account_id,type,amount,currency,category,asset_id,description,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [obj.account_id, obj.type, obj.amount, obj.currency || 'KRW', obj.category || null, obj.asset_id || null, obj.description || null, obj.created_at || new Date()]);
  // update account balance
  const delta = obj.type === 'in' ? Number(obj.amount) : -Number(obj.amount);
  await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [delta, obj.account_id]);
  return r.insertId;
}
async function update(id, obj){
  // For brevity: not updating balances on edit. In production, you should recalc balance deltas carefully.
  await db.query('UPDATE transactions SET account_id=?, type=?, amount=?, currency=?, category=?, asset_id=?, description=?, created_at=? WHERE id=?',
    [obj.account_id, obj.type, obj.amount, obj.currency || 'KRW', obj.category || null, obj.asset_id || null, obj.description || null, obj.created_at || new Date(), id]);
}
async function remove(id){
  // Adjust account balance when deleting:
  const tx = await get(id);
  if(tx){
    const delta = tx.type === 'in' ? -Number(tx.amount) : Number(tx.amount);
    await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [delta, tx.account_id]);
  }
  await db.query('DELETE FROM transactions WHERE id=?', [id]);
}
module.exports = { all, get, create, update, remove };
