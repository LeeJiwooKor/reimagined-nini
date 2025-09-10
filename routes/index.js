const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: format MySQL TIMESTAMP/Date to 'YYYY-MM-DD'
function formatDateOnly(d) {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

// ================= ROUTES =================

// Home
router.get('/', (req, res) => {
  res.render('index');
});

// Manage Page
router.get('/manage', async (req, res) => {
  const [datas] = await db.query('SELECT * FROM finances');
  const [categories] = await db.query('SELECT categories FROM categories');
  res.render('manage', { datas, categories });
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
  const [datas] = await db.query('SELECT * FROM finances');
  const [categories] = await db.query('SELECT categories FROM categories');
  res.render('banking', { datas, categories });
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

// 404
router.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

module.exports = router;
