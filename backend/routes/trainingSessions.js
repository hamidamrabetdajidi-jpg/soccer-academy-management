const express = require('express');
const {
    getAllTrainingSessions,
    createTrainingSession,
    updateTrainingSession,
    deleteTrainingSession,
    createAttendanceForSession,
    getSessionAttendance
} = require('../controllers/trainingSessionController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

console.log('🏃 Loading training session routes...');

// All routes require authentication
router.use(authenticateToken);

// Debug middleware
router.use((req, res, next) => {
    console.log(`🏃 Training Sessions API: ${req.method} ${req.path}`, {
        user: req.user?.username,
        role: req.user?.role
    });
    next();
});

// Training session CRUD routes
router.get('/', getAllTrainingSessions);
router.post('/', requireRole(['admin', 'manager', 'coach']), createTrainingSession);
router.put('/:id', requireRole(['admin', 'manager', 'coach']), updateTrainingSession);
router.delete('/:id', requireRole(['admin', 'manager', 'coach']), deleteTrainingSession);

// Attendance integration routes
router.post('/:id/attendance', requireRole(['admin', 'manager', 'coach']), createAttendanceForSession);
router.get('/:id/attendance', getSessionAttendance);

console.log('✅ Training session routes with attendance integration defined');

module.exports = router;