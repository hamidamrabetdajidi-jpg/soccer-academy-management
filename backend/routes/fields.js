const express = require('express');
const {
    getAllFields,
    getFieldById,
    createField,
    updateField,
    deleteField
} = require('../controllers/fieldController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

console.log('🏟️ Loading field management routes...');

// All routes require authentication
router.use(authenticateToken);

// Debug middleware
router.use((req, res, next) => {
    console.log(`🔍 Fields API: ${req.method} ${req.path}`, {
        params: req.params,
        user: req.user?.username,
        role: req.user?.role
    });
    next();
});

// Field CRUD routes
router.get('/', getAllFields);
router.post('/', requireRole(['admin', 'manager']), createField);
router.get('/:id', getFieldById);
router.put('/:id', requireRole(['admin', 'manager']), updateField);
router.delete('/:id', requireRole(['admin', 'manager']), deleteField); // Make sure this line exists

console.log('✅ Field management routes defined');

module.exports = router;