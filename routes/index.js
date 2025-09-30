// routes/index.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');


// =============== HELPERS ===============
function formatDateOnly(d) {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}


// replace previous deadmenSwitch function with:
async function deadmenMiddleware(req, res, next) {
  // robust bypass
  const bypassPaths = ['/dead', '/dead/on', '/dead/off'];
  if (bypassPaths.includes(req.path)) return next();

  try {
    const [[row]] = await db.query('SELECT deadmen FROM categories LIMIT 1');
    if (row && row.deadmen) {
      return res.render('503', { message: 'Deadman switch is ACTIVE. Access denied.' });
    }
  } catch (err) {
    console.error('Deadman check failed:', err);
  }

  next();
}


// Apply deadman middleware BEFORE all protected routes
router.use(deadmenMiddleware);
// Ensure new tables exist (orders, collaborators, records fallback)
async function ensureTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_number VARCHAR(255) NOT NULL,
        customer TEXT,
        total DECIMAL(12,2) DEFAULT 0,
        status ENUM('Pending','Processing','Shipped','Delivered','Cancelled') DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS collaborators (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT,
        amount DECIMAL(12,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error('ensureTables error', err);
  }
}
ensureTables().catch(e => console.error(e));

// =============== ROUTES ===============




// Home
router.get('/', (req, res) => res.render('index'));

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [vals] = await db.query('SELECT * FROM alsoValues LIMIT 1');
    res.render('dashboard', { stats: vals[0] || {} });
  } catch (err) {
    res.render('dashboard', { stats: {} });
  }
});

// ---------- Category ----------
router.get('/category', async (req, res) => {
  const [categories] = await db.query('SELECT categories, id FROM categories');
  res.render('categories', { categories });
});

router.post('/category/add', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const [exists] = await db.query('SELECT * FROM categories WHERE categories=?', [name]);
  if (exists.length) return res.json({ valid: false, error: 'Already exists' });
  const [r] = await db.query('INSERT INTO categories (categories) VALUES (?)', [name]);
  await db.query('INSERT INTO logs(location, activity) VALUES (?, ?)', ['categories', 'Creation']);
  await logActivity('Category Created', name);
  res.json({ valid: true, id: r.insertId, name });
});

router.post('/category/edit', async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'ID & Name required' });
  const [exists] = await db.query('SELECT id FROM categories WHERE categories=? AND id!=?', [name, id]);
  if (exists.length) return res.json({ valid: false, error: 'Name exists' });
  await db.query('UPDATE categories SET categories=? WHERE id=?', [name, id]);
  await db.query('INSERT INTO logs(location, activity) VALUES (?, ?)', ['categories', 'Modification']);
  await logActivity('Category Edited', `ID:${id}, New:${name}`);
  res.json({ valid: true });
});

router.post('/category/delete', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'ID required' });
  await db.query('DELETE FROM categories WHERE id=?', [id]);
  await db.query('INSERT INTO logs(location, activity) VALUES (?, ?)', ['categories', 'Removal']);
  await logActivity('Category Deleted', `ID:${id}`);
  res.json({ valid: true });
});

// ---------- Loss ----------
router.get('/loss', async (req, res) => {
  const [losses] = await db.query('SELECT * FROM losses ORDER BY date DESC');
  const [cats] = await db.query('SELECT id,categories FROM categories');
  res.render('loss', { categories: cats, losses: losses.map(l => ({ ...l, date: formatDateOnly(l.date) })) });
});

router.post('/loss/add', async (req, res) => {
  try {
    const { date, category, name, price=0, quantity=0, memo='' } = req.body;
    if (!name) return res.status(400).json({ valid: false, error: 'Name required' });
    const [r] = await db.query(
      'INSERT INTO losses (category,name,price,memo,quantity,date) VALUES (?,?,?,?,?,?)',
      [category||null, name, Number(price)||0, memo, Number(quantity)||0, date||null]
    );
    await db.query('INSERT INTO logs(location,activity) VALUES (?,?)',['losses','Creation']);
    await logActivity('Loss Added', `${name} ${quantity}×${price}`);
    res.json({ valid:true, id:r.insertId });
  } catch(e){ res.status(500).json({ valid:false, error:'Server error' }); }
});

router.post('/loss/edit', async (req, res) => {
  try {
    const { id, name, price=0, quantity=0, memo='', date, category } = req.body;
    if (!id || !name) return res.status(400).json({ valid:false,error:'ID & Name required' });
    await db.query(
      'UPDATE losses SET category=?, name=?, price=?, memo=?, quantity=?, date=? WHERE id=?',
      [category||null, name, Number(price)||0, memo, Number(quantity)||0, date||null, id]
    );
    await db.query('INSERT INTO logs(location,activity) VALUES (?,?)',['losses','Modification']);
    await logActivity('Loss Edited', `ID:${id}, ${name}`);
    res.json({ valid:true });
  } catch(e){ res.status(500).json({ valid:false,error:'Server error' }); }
});

router.post('/loss/delete', async (req,res)=>{
  const { id } = req.body;
  if(!id) return res.status(400).json({ valid:false,error:'ID required' });
  await db.query('DELETE FROM losses WHERE id=?',[id]);
  await db.query('INSERT INTO logs(location,activity) VALUES (?,?)',['losses','Removal']);
  await logActivity('Loss Deleted', `ID:${id}`);
  res.json({ valid:true });
});

// ---------- Banking ----------
router.get('/banking', async (req,res)=>{
  const [accounts] = await db.query('SELECT * FROM bank_accounts');
  const [transactions] = await db.query('SELECT * FROM bank_transactions ORDER BY created_at DESC');
  res.render('banking',{ accounts, transactions });
});

router.post('/banking/account/add', async (req,res)=>{
  const { name, type='Other' } = req.body;
  if(!name) return res.status(400).json({ valid:false,error:'Name required' });
  const [r] = await db.query('INSERT INTO bank_accounts (name,type) VALUES (?,?)',[name,type]);
  await logActivity('Bank Account Added', `${name} (${type})`);
  res.json({ valid:true, id:r.insertId });
});

router.post('/banking/account/delete', async (req,res)=>{
  const { id } = req.body;
  if(!id) return res.status(400).json({ valid:false,error:'ID required' });
  await db.query('DELETE FROM bank_accounts WHERE id=?',[id]);
  await logActivity('Bank Account Deleted', `ID:${id}`);
  res.json({ valid:true });
});

router.post('/banking/transaction/add', async (req,res)=>{
  const { account_id, amount, type, description } = req.body;
  if(!account_id || !amount || !type) return res.status(400).json({ valid:false,error:'Missing fields' });
  const amt = Number(amount);
  await db.query('INSERT INTO bank_transactions (account_id,amount,type,description) VALUES (?,?,?,?)',[account_id,amt,type,description||null]);
  if(type==='Deposit') await db.query('UPDATE bank_accounts SET balance=balance+? WHERE id=?',[amt,account_id]);
  if(type==='Withdrawal' || type==='Payment') await db.query('UPDATE bank_accounts SET balance=balance-? WHERE id=?',[amt,account_id]);
  await logActivity('Transaction Added', `${type} ${amt} (Acc ${account_id})`);
  res.json({ valid:true });
});

router.post('/banking/transaction/delete', async (req,res)=>{
  const { id } = req.body;
  if(!id) return res.status(400).json({ valid:false,error:'ID required' });
  await db.query('DELETE FROM bank_transactions WHERE id=?',[id]);
  await logActivity('Transaction Deleted', `ID:${id}`);
  res.json({ valid:true });
});

router.post('/banking/transfer', async (req,res)=>{
  const { from_account,to_account,amount,description } = req.body;
  if(!from_account||!to_account||!amount) return res.status(400).json({ valid:false,error:'Missing fields' });
  const amt = Number(amount);
  await db.query('INSERT INTO bank_transactions (account_id,related_account_id,amount,type,description) VALUES (?,?,?,?,?)',[from_account,to_account,amt,'Transfer',description||null]);
  await db.query('UPDATE bank_accounts SET balance=balance-? WHERE id=?',[amt,from_account]);
  await db.query('UPDATE bank_accounts SET balance=balance+? WHERE id=?',[amt,to_account]);
  await logActivity('Transfer', `${amt} from ${from_account} → ${to_account}`);
  res.json({ valid:true });
});

// ---------- Records ----------
router.get('/records', async (req,res)=>{
  await ensureTables();
  const [rows] = await db.query('SELECT r.*,c.categories AS category_name FROM records r LEFT JOIN categories c ON r.category_id=c.id ORDER BY r.created_at DESC');
  res.render('records',{ records:rows.map(r=>({...r,created_at:formatDateOnly(r.created_at)})) });
});

router.post('/api/records/add', async (req,res)=>{
  const { category_id=null, amount, description='' } = req.body;
  if(!amount) return res.status(400).json({ valid:false,error:'Amount required' });
  const [r] = await db.query('INSERT INTO records (category_id,amount,description) VALUES (?,?,?)',[category_id,Number(amount),description]);
  await logActivity('Record Added', `${amount}`);
  res.json({ valid:true, id:r.insertId });
});

// ---------- Orders ----------
router.get('/orders', async (req,res)=>{
  await ensureTables();
  const [orders] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
  res.render('orders',{ orders:orders.map(o=>({...o,created_at:formatDateOnly(o.created_at)})) });
});

router.post('/api/orders/add', async (req,res)=>{
  const { order_number, customer='', total=0, status='Pending' } = req.body;
  if(!order_number) return res.status(400).json({ valid:false,error:'order_number required' });
  const [r] = await db.query('INSERT INTO orders (order_number,customer,total,status) VALUES (?,?,?,?)',[order_number,customer,Number(total),status]);
  await logActivity('Order Added', `#${order_number} (${status})`);
  res.json({ valid:true, id:r.insertId });
});

router.post('/api/orders/edit', async (req,res)=>{
  const { id, order_number, customer, total, status } = req.body;
  if(!id) return res.status(400).json({ valid:false,error:'id required' });
  await db.query('UPDATE orders SET order_number=?,customer=?,total=?,status=? WHERE id=?',[order_number,customer,Number(total),status,id]);
  await logActivity('Order Edited', `ID:${id}`);
  res.json({ valid:true });
});

router.post('/api/orders/delete', async (req,res)=>{
  const { id } = req.body;
  if(!id) return res.status(400).json({ valid:false,error:'id required' });
  await db.query('DELETE FROM orders WHERE id=?',[id]);
  await logActivity('Order Deleted', `ID:${id}`);
  res.json({ valid:true });
});

// ---------- Collaboration ----------
router.get('/collaboration', async (req,res)=>{
  await ensureTables();
  const [rows] = await db.query('SELECT * FROM collaborators ORDER BY created_at DESC');
  res.render('collaboration',{ collaborators:rows });
});

router.post('/api/collab/add', async (req,res)=>{
  const { name, contact='', notes='' } = req.body;
  if(!name) return res.status(400).json({ valid:false,error:'name required' });
  const [r] = await db.query('INSERT INTO collaborators (name,contact,notes) VALUES (?,?,?)',[name,contact,notes]);
  await logActivity('Collaborator Added', name);
  res.json({ valid:true, id:r.insertId });
});

router.post('/api/collab/edit', async (req,res)=>{
  const { id, name, contact, notes } = req.body;
  if(!id) return res.status(400).json({ valid:false,error:'id required' });
  await db.query('UPDATE collaborators SET name=?,contact=?,notes=? WHERE id=?',[name,contact,notes,id]);
  await logActivity('Collaborator Edited', `ID:${id}`);
  res.json({ valid:true });
});

router.post('/api/collab/delete', async (req,res)=>{
  const { id } = req.body;
  if(!id) return res.status(400).json({ valid:false,error:'id required' });
  await db.query('DELETE FROM collaborators WHERE id=?',[id]);
  await logActivity('Collaborator Deleted', `ID:${id}`);
  res.json({ valid:true });
});

// ---------- Account (alias for bank_accounts page) ----------
router.get('/account', async (req,res)=>{
  const [accounts] = await db.query('SELECT * FROM bank_accounts ORDER BY id');
  res.render('account',{ accounts });
});

// ---------- Help ----------
router.get('/help',(req,res)=>res.render('help'));

// ---------- Dashboard APIs ----------
router.get('/api/dashboard/summary', async (req, res) => {
  try {
    const [[lossSummary]] = await db.query('SELECT COUNT(*) loss_count, IFNULL(SUM(price*quantity),0) loss_total FROM losses');
    const [[finSummary]]  = await db.query('SELECT COUNT(*) finances_count, IFNULL(SUM(price),0) finances_total FROM finances');
    const [[accSummary]]  = await db.query('SELECT COUNT(*) accounts_count, IFNULL(SUM(balance),0) accounts_balance FROM bank_accounts');
    const [[catSummary]]  = await db.query('SELECT COUNT(*) categories_count FROM categories');
    const [recent] = await db.query('SELECT action,details,created_at FROM activities ORDER BY created_at DESC LIMIT 8');

    // bank_transactions에서 출금(Withdrawal/Payment) 집계
    const [[txSummary]] = await db.query(
      `SELECT
         COUNT(CASE WHEN type IN ('Withdrawal','Payment') THEN 1 END) AS tx_out_count,
         IFNULL(SUM(CASE WHEN type IN ('Withdrawal','Payment') THEN amount ELSE 0 END),0) AS tx_out_total
       FROM bank_transactions`
    );

    // losses 테이블(명시적 지출) + bank_transactions의 출금 합계를 합침
    const loss_total_combined = Number(lossSummary.loss_total || 0) + Number(txSummary.tx_out_total || 0);
    const loss_count_combined = (lossSummary.loss_count || 0) + (txSummary.tx_out_count || 0);

    res.json({
      ok: true,
      loss_count: loss_count_combined,
      loss_total: loss_total_combined,
      finances_count: finSummary.finances_count || 0,
      finances_total: Number(finSummary.finances_total) || 0,
      accounts_count: accSummary.accounts_count || 0,
      accounts_balance: Number(accSummary.accounts_balance) || 0,
      categories_count: catSummary.categories_count || 0,
      recent_activities: recent || []
    });
  } catch (err) {
    console.error('/api/dashboard/summary error', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});


router.get('/api/banking/accounts', async (req,res)=>{
  try {
    const [accounts] = await db.query('SELECT id,name,type,balance,created_at FROM bank_accounts ORDER BY id');
    res.json({ ok:true, accounts });
  } catch(e){ res.status(500).json({ ok:false,error:'Server error' }); }
});

// in routes/index.js

// helper to hash the provided key (HMAC-SHA256)
function makeHash(key) {
  return crypto.createHmac('sha256', 'f7b3c9d1a8e2456f9b2c0e7a4d1f9c8e')
               .update(key)
               .digest('hex');
               
};
router.get('/dead', async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT deadmen FROM categories LIMIT 1');
    const isActive = row && row.deadmen ? true : false;
    res.render('deadmen', { message: `Deadman switch is currently ${isActive ? 'ACTIVE' : 'INACTIVE'}.` });
  } catch (err) {
    res.render('deadmen', { message: 'Unable to fetch deadman switch status.' });
  }
});

router.post('/dead/on', async (req, res) => {
  const key = req.body.key;
  const expectedHash = makeHash('EnergyData');
  if (!key || key !== expectedHash) return res.status(403).json({ ok: false, error: 'Forbidden: invalid key' });
  
  try {
    await db.query('UPDATE categories SET deadmen = 1');
    res.json({ ok: true, message: 'Deadman switch ACTIVATED' });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

router.post('/dead/off', async (req, res) => {
  const key = req.body.key;
  const expectedHash = makeHash('EnergyData');
  if (!key || key !== expectedHash) return res.status(403).json({ ok: false, error: 'Forbidden: invalid key' });
  
  try {
    await db.query('UPDATE categories SET deadmen = 0');
    res.json({ ok: true, message: 'Deadman switch DEACTIVATED' });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});



router.get('/api/dashboard/trends', async (req,res)=>{
  try {
    const months = Math.min(Math.max(Number(req.query.months)||6,3),24);
    const now = new Date(); const start = new Date(now.getFullYear(),now.getMonth()-(months-1),1);
    const startStr = start.toISOString().slice(0,10);
    const [lossRows] = await db.query("SELECT DATE_FORMAT(date,'%Y-%m') ym,IFNULL(SUM(price*quantity),0) total FROM losses WHERE date>=? GROUP BY ym",[startStr]);
    const [txRows] = await db.query("SELECT DATE_FORMAT(created_at,'%Y-%m') ym,IFNULL(SUM(CASE WHEN type='Deposit' THEN amount WHEN type IN('Withdrawal','Payment') THEN -amount ELSE 0 END),0) total FROM bank_transactions WHERE created_at>=? GROUP BY ym",[startStr]);
    const labels=[]; for(let i=months-1;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); labels.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }
    const lossMap=lossRows.reduce((a,r)=>{a[r.ym]=Number(r.total);return a;},{}), txMap=txRows.reduce((a,r)=>{a[r.ym]=Number(r.total);return a;},{}); 
    res.json({ ok:true, labels, losses:labels.map(l=>lossMap[l]||0), transactions:labels.map(l=>txMap[l]||0) });
  } catch(e){ res.status(500).json({ ok:false,error:'Server error' }); }
});

// 404
router.use((req,res)=>res.status(404).render('404',{ title:'Page Not Found' }));

module.exports = { router, deadmenMiddleware };
