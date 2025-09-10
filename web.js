const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();

// Middleware
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.engine('ejs', require('ejs').__express);

app.use(bodyParser.urlencoded({ extended: true }));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.set("views", path.join(__dirname, "/views"));
// Database connection
const db = require('./db')
// Routes



app.use('/', require('./routes/index'));

//app.use('/categories', require('./routes/categories'));
//app.use('/records', require('./routes/records'));


// Start server
app.listen(8001, () => console.log('Server running on http://localhost:8001'));