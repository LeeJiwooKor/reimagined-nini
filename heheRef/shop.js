const express = require('express');
const router = express.Router();
const db = require('../db');
/*
router.use(async (req, res, next) => {
  await db.query('INSERT INTO logs (ip) VALUES (?)', [req.ip]);
  next();
});*/ //too many logs;;


//why the fucking hell is error happening

router.get('/', async (req, res) => {
  const [items] = await db.query('SELECT * FROM products');
  const [[notices]] = await db.query('SELECT * FROM notices WHERE location = (?) LIMIT 1', ['index'])
  res.render('index', { items, user: req.session.user, notices });
});


///////////////////////////////////////////////
//purchasing not ready

router.post('/buy/:id', (req, res) => {
  if (!req.session.user) return res.send(`<script>alert("Please login first"); window.location.replace('/auth/login');</script>`);
  res.redirect('/');
});
////////////////////////////////////////////////

router.get('/faq', async (req, res) => {
  const [faqs] = await db.query('SELECT * FROM faqs');
  res.render('faq', { faqs, user: req.session.user });
});

router.get('/shop/:id', async (req, res) => {
  const [items] = await db.query('SELECT * FROM procucts WHERE id = ?', [req.params.id]);
  //const img = require('../public/img/:id')
  if (!req.session.user) return res.redirect('/auth/login');
  res.render('developing');
});

router.get('/shop/', async (req, res) => {
  const [items] = await db.query('SELECT * FROM products');
  res.render('shop', {items});
});


////////////////////////////////////////////////
router.get('/mypage', async(req, res) => {
  if (!req.session.user) return res.send(`<script>alert("Please login first"); window.location.replace('/auth/login');</script>`);


  const [[user]] = await db.query('SELECT * FROM users WHERE username = ?', [req.session.user.username]);
  const [orders] = await db.query('SELECT * FROM orders');

  console.log(orders)//hmmm

  res.render('mypage', { user, orders });
});
////////////////////////////////////////////////



router.use((req, res) => {
    res.status(404).render('404', { title: 'Page Not Found' });
});

module.exports = router;

