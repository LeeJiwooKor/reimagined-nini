const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./db');
const app = express();
// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));
// Serve static assets
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));


// Session middleware
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

// Make the logged-in user available to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Route handlers
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', shopRoutes);

// Start the server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
