const express = require('express');
const router = express.Router();
const dashboardCtrl = require('../controllers/dashboardController');

router.get('/', dashboardCtrl.index);

module.exports = router;
