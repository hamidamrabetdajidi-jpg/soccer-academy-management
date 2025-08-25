const express = require('express');
const {
    getAllValuations,
    getValuationById,
    createValuation,
    updateValuation,
    deleteValuation,
    getPlayerValuationHistory,
    getValuationStats
} = require('../controllers/valuationController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Debug middleware
router.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, {
        user: req.user?.username,
        role: req.user?.role
    });
    next();
});

// Valuation routes
router.get('/', getAllValuations);
router.get('/stats', getValuationStats);
router.post('/', requireRole(['admin', 'manager', 'coach']), createValuation);
router.get('/:id', getValuationById);
router.put('/:id', requireRole(['admin', 'manager', 'coach']), updateValuation);
router.delete('/:id', requireRole(['admin', 'manager', 'coach']), deleteValuation);

// Player-specific routes
router.get('/player/:playerId/history', getPlayerValuationHistory);

module.exports = router;