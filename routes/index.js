const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: format MySQL TIMESTAMP/Date to 'YYYY-MM-DD'
function formatDateOnly(d) {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};

async function logActivity(action, details = null) {
  try {
    await db.query(
      'INSERT INTO activities (action, details) VALUES (?, ?)',
      [action, details]
    );
  } catch (err) {
    console.error('logActivity error:', err);
  }
}


// ================= ROUTES =================

// Home
router.get('/', (req, res) => {
  res.render('index');
});


// Loss Page
router.get('/loss', async (req, res) => {
  const [losses] = await db.query('SELECT * FROM losses');
  const [categories] = await db.query('SELECT categories, id FROM categories');
  const formattedLosses = losses.map(l => ({ ...l, date: formatDateOnly(l.date) }));
  res.render('loss', { categories, losses: formattedLosses });
});

// Banking Page
router.get('/banking', async (req, res) => {
  const [accounts] = await db.query('SELECT * FROM bank_accounts');
  const [transactions] = await db.query('SELECT * FROM bank_transactions ORDER BY created_at DESC');
  res.render('banking', { accounts, transactions });
});

// Category Management Page
router.get('/category', async (req, res) => {
  const [categories] = await db.query('SELECT categories, id FROM categories');
  res.render('categories', { categories });
});

// ================= CATEGORY API =================

// Add Category
router.post('/category/add', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const [exists] = await db.query('SELECT * FROM categories WHERE categories = ?', [name]);
  if (exists.length > 0) {
    return res.json({ valid: false, error: 'Category already exists' });
  }

  const [result] = await db.query('INSERT INTO categories (categories) VALUES (?)', [name]);
  await db.query('INSERT INTO logs(location, activity) VALUES (?, ?)', ['categories', 'Creation']);

  res.json({ valid: true, id: result.insertId, name });
});

// Edit Category
router.post('/category/edit', async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'ID and Name required' });

  const [exists] = await db.query('SELECT * FROM categories WHERE categories = ? AND id != ?', [name, id]);
  if (exists.length > 0) return res.json({ valid: false, error: 'Name already exists' });

  await db.query('UPDATE categories SET categories = ? WHERE id = ?', [name, id]);
  await db.query('INSERT INTO logs(location, activity) VALUES (?, ?)', ['categories', 'Modification']);

  res.json({ valid: true, name });
});

// Delete Category
router.post('/category/delete', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'ID required' });

  await db.query('DELETE FROM categories WHERE id = ?', [id]);
  await db.query('INSERT INTO logs(location, activity) VALUES (?, ?)', ['categories', 'Removal']);

  res.json({ valid: true });
});

// ================= LOSS API =================

// Add Loss
router.post('/loss/add', async (req, res) => {
  try {
    const { date, category, name, price = 0, quantity, memo = '' } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ valid: false, error: 'Name required' });
    if (quantity === undefined) return res.status(400).json({ valid: false, error: 'Quantity required' });

    const qty = Number(quantity);
    const pr = Number(price);

    if (!Number.isFinite(qty) || qty < 0) return res.status(400).json({ valid: false, error: 'Quantity must be non-negative' });
    if (!Number.isFinite(pr) || pr < 0) return res.status(400).json({ valid: false, error: 'Price must be non-negative' });

    const [result] = await db.query(
      'INSERT INTO losses (category, name, price, memo, quantity, date) VALUES (?, ?, ?, ?, ?, ?)',
      [category || null, name.trim(), pr, memo || null, qty, date || null]
    );

    await db.query('INSERT INTO logs(location, activity) VALUES (?, ?)', ['losses', 'Creation']);

    res.json({
      valid: true,
      id: result.insertId,
      category: category || '',
      name: name.trim(),
      price: pr,
      quantity: qty,
      memo,
      date: date || ''
    });
  } catch (err) {
    console.error('POST /loss/add error:', err);
    res.status(500).json({ valid: false, error: 'Server error' });
  }
});

// Edit Loss
router.post('/loss/edit', async (req, res) => {
  try {
    const { id, date, category, name, price = 0, quantity, memo = '' } = req.body;
    if (!id) return res.status(400).json({ valid: false, error: 'ID required' });
    if (!name || !name.trim()) return res.status(400).json({ valid: false, error: 'Name required' });
    if (quantity === undefined) return res.status(400).json({ valid: false, error: 'Quantity required' });

    const qty = Number(quantity);
    const pr = Number(price);

    if (!Number.isFinite(qty) || qty < 0) return res.status(400).json({ valid: false, error: 'Quantity must be non-negative' });
    if (!Number.isFinite(pr) || pr < 0) return res.status(400).json({ valid: false, error: 'Price must be non-negative' });

    const [existing] = await db.query('SELECT id FROM losses WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ valid: false, error: 'Record not found' });

    const finalDate = date || (await db.query('SELECT date FROM losses WHERE id = ?', [id]))?.[0]?.[0]?.date || null;

    await db.query(
      'UPDATE losses SET category = ?, name = ?, price = ?, memo = ?, quantity = ?, date = ? WHERE id = ?',
      [category || null, name.trim(), pr, memo || null, qty, finalDate, id]
    );

    await db.query('INSERT INTO logs(location, activity) VALUES (?, ?)', ['losses', 'Modification']);

    res.json({ valid: true, id, category, name: name.trim(), price: pr, quantity: qty, memo, date: finalDate ? formatDateOnly(finalDate) : '' });
  } catch (err) {
    console.error('POST /loss/edit error:', err);
    res.status(500).json({ valid: false, error: 'Server error' });
  }
});

// Delete Loss
router.post('/loss/delete', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ valid: false, error: 'ID required' });

    const [existing] = await db.query('SELECT id FROM losses WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ valid: false, error: 'Record not found' });

    await db.query('DELETE FROM losses WHERE id = ?', [id]);
    await db.query('INSERT INTO logs(location, activity) VALUES (?, ?)', ['losses', 'Removal']);

    res.json({ valid: true });
  } catch (err) {
    console.error('POST /loss/delete error:', err);
    res.status(500).json({ valid: false, error: 'Server error' });
  }
});

// Dashboard
router.get('/dashboard', async (req, res) => {
  const [vals] = await db.query('SELECT * FROM alsoValues LIMIT 1');
  res.render('dashboard', { stats: vals[0] || {} });
});

router.post('/banking/account/add', async (req, res) => {
  const { name, type } = req.body;
  if (!name) return res.status(400).json({ valid: false, error: 'Account name required' });

  const [result] = await db.query(
    'INSERT INTO bank_accounts (name, type) VALUES (?, ?)',
    [name, type || 'Other']
  );

  res.json({ valid: true, id: result.insertId, name, type });
});

// Delete Account
router.post('/banking/account/delete', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ valid: false, error: 'ID required' });

  await db.query('DELETE FROM bank_accounts WHERE id = ?', [id]);
  res.json({ valid: true });
});

// Add Transaction
router.post('/banking/transaction/add', async (req, res) => {
  const { account_id, amount, type, description } = req.body;
  if (!account_id || !amount || !type) {
    return res.status(400).json({ valid: false, error: 'Missing required fields' });
  }

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ valid: false, error: 'Invalid amount' });
  }

  await db.query(
    'INSERT INTO bank_transactions (account_id, amount, type, description) VALUES (?, ?, ?, ?)',
    [account_id, amt, type, description || null]
  );

  if (type === 'Deposit') {
    await db.query('UPDATE bank_accounts SET balance = balance + ? WHERE id = ?', [amt, account_id]);
  } else if (type === 'Withdrawal' || type === 'Payment') {
    await db.query('UPDATE bank_accounts SET balance = balance - ? WHERE id = ?', [amt, account_id]);
  }

  res.json({ valid: true });
});

// Delete Transaction
router.post('/banking/transaction/delete', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ valid: false, error: 'ID required' });

  await db.query('DELETE FROM bank_transactions WHERE id = ?', [id]);
  res.json({ valid: true });
});

// Transfer
router.post('/banking/transfer', async (req, res) => {
  const { from_account, to_account, amount, description } = req.body;
  if (!from_account || !to_account || !amount) {
    return res.status(400).json({ valid: false, error: 'Missing fields' });
  }

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ valid: false, error: 'Invalid amount' });
  }

  // Deduct from source
  await db.query(
    'INSERT INTO bank_transactions (account_id, related_account_id, amount, type, description) VALUES (?, ?, ?, ?, ?)',
    [from_account, to_account, amt, 'Transfer', description || null]
  );
  await db.query('UPDATE bank_accounts SET balance = balance - ? WHERE id = ?', [amt, from_account]);

  await db.query('UPDATE bank_accounts SET balance = balance + ? WHERE id = ?', [amt, to_account]);

  res.json({ valid: true });

  // Render dashboard page (keeps old alsoValues usage for initial show)
router.get('/dashboard', async (req, res) => {
  const [vals] = await db.query('SELECT * FROM alsoValues LIMIT 1');
  res.render('dashboard', { stats: vals[0] || {} });
});
//================= DASHBOARD API =================

// API: dashboard summary (numbers & recent activities)
router.get('/api/dashboard/summary', async (req, res) => {
  try {
    const [[lossSummary]] = await db.query('SELECT COUNT(*) AS loss_count, IFNULL(SUM(price*quantity),0) AS loss_total FROM losses');
    const [[finSummary]] = await db.query('SELECT COUNT(*) AS finances_count, IFNULL(SUM(price),0) AS finances_total FROM finances');
    const [[accSummary]] = await db.query('SELECT COUNT(*) AS accounts_count, IFNULL(SUM(balance),0) AS accounts_balance FROM bank_accounts');
    const [[catSummary]] = await db.query('SELECT COUNT(*) AS categories_count FROM categories');
    const [recentActivities] = await db.query('SELECT action, details, created_at FROM activities ORDER BY created_at DESC LIMIT 8');

    res.json({
      ok: true,
      loss_count: lossSummary.loss_count || 0,
      loss_total: Number(lossSummary.loss_total) || 0,
      finances_count: finSummary.finances_count || 0,
      finances_total: Number(finSummary.finances_total) || 0,
      accounts_count: accSummary.accounts_count || 0,
      accounts_balance: Number(accSummary.accounts_balance) || 0,
      categories_count: catSummary.categories_count || 0,
      recent_activities: recentActivities || []
    });
  } catch (err) {
    console.error('GET /api/dashboard/summary error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// API: simple list of bank accounts (for dashboard small widget)
router.get('/api/banking/accounts', async (req, res) => {
  try {
    const [accounts] = await db.query('SELECT id, name, type, balance, created_at FROM bank_accounts ORDER BY id');
    res.json({ ok: true, accounts });
  } catch (err) {
    console.error('GET /api/banking/accounts error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// API: trends (losses and bank transaction deltas) aggregated monthly
router.get('/api/dashboard/trends', async (req, res) => {
  try {
    const months = Math.min(Math.max(Number(req.query.months) || 6, 3), 24); // between 3 and 24
    // compute start date (first day of earliest month)
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const startStr = start.toISOString().slice(0, 10);

    // Losses aggregated by YYYY-MM
    const [lossRows] = await db.query(
      "SELECT DATE_FORMAT(date, '%Y-%m') AS ym, IFNULL(SUM(price * quantity),0) AS total FROM losses WHERE date >= ? GROUP BY ym ORDER BY ym",
      [startStr]
    );

    // Bank transactions aggregated by month (deposits positive, withdrawals/payment negative)
    const [txRows] = await db.query(
      "SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, IFNULL(SUM(CASE WHEN type='Deposit' THEN amount WHEN type IN ('Withdrawal','Payment') THEN -amount ELSE 0 END),0) AS total FROM bank_transactions WHERE created_at >= ? GROUP BY ym ORDER BY ym",
      [startStr]
    );

    // Build labels array YYYY-MM for requested months
    const labels = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      labels.push(ym);
    }

    // Map results into full arrays (fill 0 if missing)
    const lossMap = lossRows.reduce((acc, r) => { acc[r.ym] = Number(r.total); return acc; }, {});
    const txMap = txRows.reduce((acc, r) => { acc[r.ym] = Number(r.total); return acc; }, {});
    const losses = labels.map(l => lossMap[l] || 0);
    const txs = labels.map(l => txMap[l] || 0);

    res.json({ ok: true, labels, losses, transactions: txs });
  } catch (err) {
    console.error('GET /api/dashboard/trends error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

});



// 404
router.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

module.exports = router;
