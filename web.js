const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();

// view engine
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs').__express);
app.set("views", path.join(__dirname, "/views"));

// body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// static
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
// DB
const db = require('./db');

// routes & middleware
const { router: indexRoutes, deadmenMiddleware } = require('./routes/index');

// deadman check BEFORE routes
app.use(deadmenMiddleware);
app.use('/', indexRoutes);

// server
app.listen(8001, () => console.log('Server running on http://localhost:8001'));
