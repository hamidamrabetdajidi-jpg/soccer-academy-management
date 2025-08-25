const express = require('express');
const {
    getAllAttendance,
    getAttendanceSummary,
    createAttendance,
    updateAttendance,
    deleteAttendance,
    bulkCreateAttendance
} = require('../controllers/attendanceController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

console.log('📋 Loading attendance routes...');

// All routes require authentication
router.use(authenticateToken);

// Debug middleware
router.use((req, res, next) => {
    console.log(`📊 Attendance API: ${req.method} ${req.path}`, {
        user: req.user?.username,
        role: req.user?.role
    });
    next();
});

// Attendance routes
router.get('/', getAllAttendance);
router.get('/summary', getAttendanceSummary);
router.post('/', requireRole(['admin', 'manager', 'coach']), createAttendance);
router.post('/bulk', requireRole(['admin', 'manager', 'coach']), bulkCreateAttendance);
router.put('/:id', requireRole(['admin', 'manager', 'coach']), updateAttendance);
router.delete('/:id', requireRole(['admin', 'manager', 'coach']), deleteAttendance);

console.log('✅ Attendance routes defined');

module.exports = router;