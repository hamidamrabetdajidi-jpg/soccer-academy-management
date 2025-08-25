const express = require('express');
const {
    getAllBookings,
    getFieldBookings,
    checkAvailability,
    createBooking,
    updateBooking,
    cancelBooking
} = require('../controllers/fieldBookingController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

console.log('📅 Loading field booking routes...');

// All routes require authentication
router.use(authenticateToken);

// Debug middleware
router.use((req, res, next) => {
    console.log(`Field Bookings ${req.method} ${req.path}`, {
        user: req.user?.username,
        role: req.user?.role
    });
    next();
});

// Booking routes
router.get('/', getAllBookings);
router.post('/', requireRole(['admin', 'manager', 'coach']), createBooking);
router.get('/availability', checkAvailability);
router.get('/field/:fieldId', getFieldBookings);
router.put('/:id', requireRole(['admin', 'manager', 'coach']), updateBooking);
router.delete('/:id', requireRole(['admin', 'manager', 'coach']), cancelBooking);

console.log('✅ Field booking routes defined');

module.exports = router;