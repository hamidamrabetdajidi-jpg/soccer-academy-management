const { getDatabase } = require('../config/database');

const getAllBookings = async (req, res) => {
    try {
        const { 
            field_id,
            booking_date,
            start_date,
            end_date,
            booking_type,
            status,
            booked_by_user_id,
            sort_by = 'booking_date',
            sort_order = 'asc'
        } = req.query;
        
        const db = getDatabase();
        
        let query = `
            SELECT 
                fb.*,
                f.name as field_name,
                u.first_name || ' ' || u.last_name as booked_by_name,
                ts.title as session_title,
                ROUND((julianday(fb.end_time) - julianday(fb.start_time)) * 24, 2) as duration_hours
            FROM field_bookings fb
            LEFT JOIN fields f ON fb.field_id = f.id
            LEFT JOIN users u ON fb.booked_by_user_id = u.id
            LEFT JOIN training_sessions ts ON fb.session_id = ts.id
            WHERE 1=1
        `;
        
        const params = [];
        
        // Apply filters
        if (field_id) {
            query += ' AND fb.field_id = ?';
            params.push(parseInt(field_id));
        }
        
        if (booking_date) {
            query += ' AND fb.booking_date = ?';
            params.push(booking_date);
        }
        
        if (start_date && end_date) {
            query += ' AND fb.booking_date BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }
        
        if (booking_type) {
            query += ' AND fb.booking_type = ?';
            params.push(booking_type);
        }
        
        if (status) {
            query += ' AND fb.status = ?';
            params.push(status);
        }
        
        if (booked_by_user_id) {
            query += ' AND fb.booked_by_user_id = ?';
            params.push(parseInt(booked_by_user_id));
        }
        
        // Add sorting
        const allowedSortFields = ['booking_date', 'start_time', 'booking_title', 'field_name'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'booking_date';
        const sortDirection = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        
        if (sortField === 'field_name') {
            query += ` ORDER BY f.name ${sortDirection}, fb.booking_date ${sortDirection}, fb.start_time ${sortDirection}`;
        } else {
            query += ` ORDER BY fb.${sortField} ${sortDirection}`;
            if (sortField !== 'booking_date') {
                query += `, fb.booking_date ${sortDirection}, fb.start_time ${sortDirection}`;
            }
        }
        
        console.log('📅 Getting bookings with query');
        
        const bookings = await db.all(query, params);
        
        // Get summary statistics
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_bookings,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
                COUNT(CASE WHEN booking_date >= date('now') THEN 1 END) as upcoming_bookings,
                COUNT(DISTINCT field_id) as fields_in_use
            FROM field_bookings
            WHERE booking_date >= date('now', '-7 days')
        `);
        
        console.log(`📊 Found ${bookings.length} bookings`);
        res.json({ 
            bookings,
            stats
        });
        
    } catch (error) {
        console.error('❌ Get bookings error:', error);
        res.status(500).json({ error: 'Failed to get bookings: ' + error.message });
    }
};

const getFieldBookings = async (req, res) => {
    try {
        const { fieldId } = req.params;
        const { date, start_date, end_date } = req.query;
        
        const db = getDatabase();
        
        let query = `
            SELECT 
                fb.*,
                u.first_name || ' ' || u.last_name as booked_by_name,
                ts.title as session_title
            FROM field_bookings fb
            LEFT JOIN users u ON fb.booked_by_user_id = u.id
            LEFT JOIN training_sessions ts ON fb.session_id = ts.id
            WHERE fb.field_id = ?
        `;
        
        const params = [fieldId];
        
        if (date) {
            query += ' AND fb.booking_date = ?';
            params.push(date);
        } else if (start_date && end_date) {
            query += ' AND fb.booking_date BETWEEN ? AND ?';
            params.push(start_date, end_date);
        } else {
            // Default to show bookings from today onwards
            query += ' AND fb.booking_date >= date("now")';
        }
        
        query += ' ORDER BY fb.booking_date ASC, fb.start_time ASC';
        
        const bookings = await db.all(query, params);
        
        res.json({ bookings });
        
    } catch (error) {
        console.error('❌ Get field bookings error:', error);
        res.status(500).json({ error: 'Failed to get field bookings: ' + error.message });
    }
};

const checkAvailability = async (req, res) => {
    try {
        const { field_id, date, start_time, end_time } = req.query;
        
        if (!field_id || !date || !start_time || !end_time) {
            return res.status(400).json({
                error: 'Required parameters: field_id, date, start_time, end_time'
            });
        }
        
        const db = getDatabase();
        
        // Check for conflicting bookings
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
        
        // If not available, suggest alternative slots
        let alternative_slots = [];
        if (!is_available) {
            // Get all bookings for the day
            const dayBookings = await db.all(`
                SELECT start_time, end_time 
                FROM field_bookings 
                WHERE field_id = ? AND booking_date = ? AND status = 'confirmed'
                ORDER BY start_time
            `, [field_id, date]);
            
            // Generate alternative time slots (simplified)
            const suggestedTimes = [
                { start: '08:00', end: '09:30' },
                { start: '10:00', end: '11:30' },
                { start: '12:00', end: '13:30' },
                { start: '14:00', end: '15:30' },
                { start: '16:00', end: '17:30' },
                { start: '18:00', end: '19:30' }
            ];
            
            alternative_slots = suggestedTimes.filter(slot => {
                const hasConflict = dayBookings.some(booking => 
                    (slot.start <= booking.start_time && slot.end > booking.start_time) ||
                    (slot.start < booking.end_time && slot.end >= booking.end_time) ||
                    (slot.start >= booking.start_time && slot.end <= booking.end_time)
                );
                return !hasConflict;
            }).map(slot => ({
                date,
                start_time: slot.start,
                end_time: slot.end,
                is_available: true
            }));
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
};

const createBooking = async (req, res) => {
    try {
        const {
            field_id, session_id, booking_type, booking_title, booking_date,
            start_time, end_time, notes, recurring_type, recurring_end_date
        } = req.body;
        
        console.log('📅 Creating booking:', req.body);
        
        // Validation
        if (!field_id || !booking_title || !booking_date || !start_time || !end_time) {
            return res.status(400).json({
                error: 'Required fields: field_id, booking_title, booking_date, start_time, end_time'
            });
        }
        
        const db = getDatabase();
        
        // Check if field exists
        const field = await db.get('SELECT id FROM fields WHERE id = ? AND is_active = 1', [field_id]);
        if (!field) {
            return res.status(404).json({ error: 'Field not found' });
        }
        
        // Check for conflicts
        const conflicts = await db.all(`
            SELECT id, booking_title, start_time, end_time 
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
                field_id, session_id, booking_type, booking_title, booking_date,
                start_time, end_time, booked_by_user_id, notes, recurring_type, recurring_end_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            field_id,
            session_id || null,
            booking_type || 'training',
            booking_title,
            booking_date,
            start_time,
            end_time,
            req.user.id,
            notes || '',
            recurring_type || 'none',
            recurring_end_date || null
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
};

const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            booking_title, booking_date, start_time, end_time, notes, status
        } = req.body;
        
        console.log('🔄 Updating booking:', id, req.body);
        
        const db = getDatabase();
        
        // Check if booking exists and user has permission
        const booking = await db.get(`
            SELECT * FROM field_bookings 
            WHERE id = ? AND (booked_by_user_id = ? OR ? IN ('admin', 'manager'))
        `, [id, req.user.id, req.user.role]);
        
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found or no permission' });
        }
        
        // If changing time/date, check for conflicts
        if (booking_date && start_time && end_time) {
            const conflicts = await db.all(`
                SELECT id, booking_title 
                FROM field_bookings 
                WHERE field_id = ? AND booking_date = ? AND status = 'confirmed' AND id != ?
                AND (
                    (start_time <= ? AND end_time > ?) OR
                    (start_time < ? AND end_time >= ?) OR
                    (start_time >= ? AND end_time <= ?)
                )
            `, [booking.field_id, booking_date, id, start_time, start_time, end_time, end_time, start_time, end_time]);
            
            if (conflicts.length > 0) {
                return res.status(409).json({ 
                    error: 'Updated time conflicts with existing booking',
                    conflicts 
                });
            }
        }
        
        const result = await db.run(`
            UPDATE field_bookings SET
                booking_title = COALESCE(?, booking_title),
                booking_date = COALESCE(?, booking_date),
                start_time = COALESCE(?, start_time),
                end_time = COALESCE(?, end_time),
                notes = COALESCE(?, notes),
                status = COALESCE(?, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [booking_title, booking_date, start_time, end_time, notes, status, id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        console.log('✅ Booking updated successfully');
        res.json({ message: 'Booking updated successfully' });
        
    } catch (error) {
        console.error('❌ Update booking error:', error);
        res.status(500).json({ error: 'Failed to update booking: ' + error.message });
    }
};

const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        const db = getDatabase();
        
        // Check if booking exists and user has permission
        const booking = await db.get(`
            SELECT * FROM field_bookings 
            WHERE id = ? AND (booked_by_user_id = ? OR ? IN ('admin', 'manager'))
        `, [id, req.user.id, req.user.role]);
        
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found or no permission' });
        }
        
        await db.run(`
            UPDATE field_bookings SET
                status = 'cancelled',
                notes = COALESCE(notes || ' | ', '') || 'Cancelled: ' || COALESCE(?, 'No reason provided'),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [reason, id]);
        
        console.log('✅ Booking cancelled successfully');
        res.json({ message: 'Booking cancelled successfully' });
        
    } catch (error) {
        console.error('❌ Cancel booking error:', error);
        res.status(500).json({ error: 'Failed to cancel booking: ' + error.message });
    }
};

module.exports = {
    getAllBookings,
    getFieldBookings,
    checkAvailability,
    createBooking,
    updateBooking,
    cancelBooking
};