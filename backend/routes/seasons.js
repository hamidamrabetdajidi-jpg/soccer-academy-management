const express = require('express');
const { getSeasons } = require('../controllers/seasonController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.get('/', getSeasons);

module.exports = router;