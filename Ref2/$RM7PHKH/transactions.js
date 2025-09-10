const express = require('express');
const router = express.Router();
const c = require('../controllers/transactionsController');

router.get('/', c.list);
router.get('/new', c.showNew);
router.post('/new', c.postNew);
router.get('/:id/edit', c.showEdit);
router.post('/:id/edit', c.postEdit);
router.post('/:id/delete', c.remove);

module.exports = router;
