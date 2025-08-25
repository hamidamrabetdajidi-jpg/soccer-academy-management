const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

console.log('📅 Loading field booking routes...');

// All routes require authentication
router.use(authenticateToken);

// Simple test route
router.get('/test', (req, res) => {
    console.log('🧪 Field booking test route hit');
    res.json({ message: 'Field bookings route is working!', user: req.user?.username });
});

// Get all bookings (simplified)
router.get('/', async (req, res) => {
    try {
        console.log('📅 Getting all bookings');
        const db = getDatabase();
        
        const bookings = await db.all(`
            SELECT 
                fb.*,
                f.name as field_name,
                u.first_name || ' ' || u.last_name as booked_by_name
            FROM field_bookings fb
            LEFT JOIN fields f ON fb.field_id = f.id
            LEFT JOIN users u ON fb.booked_by_user_id = u.id
            ORDER BY fb.booking_date DESC, fb.start_time DESC
            LIMIT 50
        `);
        
        const stats = {
            total_bookings: bookings.length,
            confirmed_bookings: bookings.filter(b => b.status === 'confirmed').length,
            pending_bookings: bookings.filter(b => b.status === 'pending').length
        };
        
        res.json({ bookings, stats });
        
    } catch (error) {
        console.error('❌ Get bookings error:', error);
        res.status(500).json({ error: 'Failed to get bookings: ' + error.message });
    }
});

// Get bookings for a specific field
router.get('/field/:fieldId', async (req, res) => {
    try {
        const { fieldId } = req.params;
        console.log('📅 Getting bookings for field:', fieldId);
        
        const db = getDatabase();
        
        const bookings = await db.all(`
            SELECT 
                fb.*,
                u.first_name || ' ' || u.last_name as booked_by_name
            FROM field_bookings fb
            LEFT JOIN users u ON fb.booked_by_user_id = u.id
            WHERE fb.field_id = ? AND fb.booking_date >= date('now')
            ORDER BY fb.booking_date ASC, fb.start_time ASC
        `, [fieldId]);
        
        res.json({ bookings });
        
    } catch (error) {
        console.error('❌ Get field bookings error:', error);
        res.status(500).json({ error: 'Failed to get field bookings: ' + error.message });
    }
});

// Check availability
router.get('/availability', async (req, res) => {
    try {
        const { field_id, date, start_time, end_time } = req.query;
        
        if (!field_id || !date || !start_time || !end_time) {
            return res.status(400).json({
                error: 'Required parameters: field_id, date, start_time, end_time'
            });
        }
        
        console.log('🔍 Checking availability:', { field_id, date, start_time, end_time });
        
        const db = getDatabase();
        
        // Check for conflicts
        const conflicts = await db.all(`
            SELECT 
                fb.*,
                f.name as field_name
            FROM field_bookings fb
            JOIN fields f ON fb.field_id = f.id
            WHERE fb.field_id = ? 
            AND fb.booking_date = ?
            AND fb.status = 'confirmed'
            AND (
                (fb.start_time <= ? AND fb.end_time > ?) OR
                (fb.start_time < ? AND fb.end_time >= ?) OR
                (fb.start_time >= ? AND fb.end_time <= ?)
            )
        `, [field_id, date, start_time, start_time, end_time, end_time, start_time, end_time]);
        
        const is_available = conflicts.length === 0;
        
        // Simple alternative slots if not available
        let alternative_slots = [];
        if (!is_available) {
            alternative_slots = [
                { start_time: '08:00', end_time: '09:30', is_available: true },
                { start_time: '10:00', end_time: '11:30', is_available: true },
                { start_time: '14:00', end_time: '15:30', is_available: true },
                { start_time: '16:00', end_time: '17:30', is_available: true }
            ].filter((slot, index) => index < 2); // Show only 2 alternatives
        }
        
        res.json({
            field_id: parseInt(field_id),
            date,
            start_time,
            end_time,
            is_available,
            conflicts,
            alternative_slots
        });
        
    } catch (error) {
        console.error('❌ Check availability error:', error);
        res.status(500).json({ error: 'Failed to check availability: ' + error.message });
    }
});

// Create booking
router.post('/', async (req, res) => {
    try {
        const {
            field_id, booking_title, booking_type, booking_date,
            start_time, end_time, notes
        } = req.body;
        
        console.log('📅 Creating booking:', req.body);
        
        if (!field_id || !booking_title || !booking_date || !start_time || !end_time) {
            return res.status(400).json({
                error: 'Required fields: field_id, booking_title, booking_date, start_time, end_time'
            });
        }
        
        const db = getDatabase();
        
        // Check for conflicts first
        const conflicts = await db.all(`
            SELECT id, booking_title 
            FROM field_bookings 
            WHERE field_id = ? AND booking_date = ? AND status = 'confirmed'
            AND (
                (start_time <= ? AND end_time > ?) OR
                (start_time < ? AND end_time >= ?) OR
                (start_time >= ? AND end_time <= ?)
            )
        `, [field_id, booking_date, start_time, start_time, end_time, end_time, start_time, end_time]);
        
        if (conflicts.length > 0) {
            return res.status(409).json({ 
                error: 'Time slot conflicts with existing booking',
                conflicts 
            });
        }
        
        const result = await db.run(`
            INSERT INTO field_bookings (
                field_id, booking_title, booking_type, booking_date,
                start_time, end_time, booked_by_user_id, notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
        `, [
            field_id,
            booking_title,
            booking_type || 'training',
            booking_date,
            start_time,
            end_time,
            req.user.id,
            notes || ''
        ]);
        
        console.log('✅ Booking created with ID:', result.lastID);
        
        res.status(201).json({ 
            message: 'Booking created successfully', 
            id: result.lastID
        });
        
    } catch (error) {
        console.error('❌ Create booking error:', error);
        res.status(500).json({ error: 'Failed to create booking: ' + error.message });
    }
});

// Cancel booking
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('❌ Cancelling booking:', id);
        
        const db = getDatabase();
        
        await db.run(`
            UPDATE field_bookings SET
                status = 'cancelled',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND booked_by_user_id = ?
        `, [id, req.user.id]);
        
        res.json({ message: 'Booking cancelled successfully' });
        
    } catch (error) {
        console.error('❌ Cancel booking error:', error);
        res.status(500).json({ error: 'Failed to cancel booking: ' + error.message });
    }
});

console.log('✅ Field booking routes defined');

module.exports = router;