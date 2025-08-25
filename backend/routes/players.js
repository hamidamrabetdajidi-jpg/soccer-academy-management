const express = require('express');
const {
    getAllPlayers,
    createPlayer,
    getPlayerById,
    deletePlayer,
    getCategories,
    uploadPlayerPhoto,
    upload
} = require('../controllers/playerController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Categories routes
router.get('/categories', getCategories);

// Player routes
router.get('/', getAllPlayers);
router.post('/', requireRole(['admin', 'manager']), createPlayer);
router.get('/:id', getPlayerById);
router.delete('/:id', requireRole(['admin', 'manager']), deletePlayer);

// Photo upload route
router.post('/:id/photo', requireRole(['admin', 'manager']), upload.single('photo'), uploadPlayerPhoto);

module.exports = router;