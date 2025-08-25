const { getDatabase } = require('../config/database');

const getAllAttendance = async (req, res) => {
    try {
        const {
            player_id,
            event_type,
            status,
            start_date,
            end_date,
            session_id,
            sort_by = 'event_date',
            sort_order = 'desc',
            page = 1,
            limit = 50
        } = req.query;
        
        console.log('📋 Getting attendance records with filters:', req.query);
        
        const db = getDatabase();
        
        let query = `
            SELECT 
                a.*,
                p.first_name || ' ' || p.last_name as player_name,
                p.email as player_email,
                ts.title as session_title,
                u.first_name || ' ' || u.last_name as marked_by_name
            FROM attendance a
            LEFT JOIN players p ON a.player_id = p.id
            LEFT JOIN training_sessions ts ON a.session_id = ts.id
            LEFT JOIN users u ON a.marked_by_user_id = u.id
            WHERE 1=1
        `;
        
        const params = [];
        
        // Apply filters
        if (player_id) {
            query += ' AND a.player_id = ?';
            params.push(parseInt(player_id));
        }
        
        if (event_type) {
            query += ' AND a.event_type = ?';
            params.push(event_type);
        }
        
        if (status) {
            query += ' AND a.status = ?';
            params.push(status);
        }
        
        if (session_id) {
            query += ' AND a.session_id = ?';
            params.push(parseInt(session_id));
        }
        
        if (start_date) {
            query += ' AND a.event_date >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            query += ' AND a.event_date <= ?';
            params.push(end_date);
        }
        
        // Sorting
        const allowedSortFields = ['event_date', 'player_name', 'status', 'event_type', 'created_at'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'event_date';
        const sortDirection = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        
        if (sortField === 'player_name') {
            query += ` ORDER BY p.first_name ${sortDirection}, p.last_name ${sortDirection}`;
        } else {
            query += ` ORDER BY a.${sortField} ${sortDirection}`;
        }
        
        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);
        
        const attendance = await db.all(query, params);
        
        // Get total count
        let countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
        countQuery = countQuery.replace(/ORDER BY[\s\S]*/, '');
        countQuery = countQuery.replace(/LIMIT[\s\S]*/, '');
        
        const countParams = params.slice(0, -2);
        const totalResult = await db.get(countQuery, countParams);
        const total = totalResult?.total || 0;
        
        // Get attendance statistics
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
                COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused_count,
                COUNT(DISTINCT player_id) as total_players,
                ROUND(AVG(CASE WHEN status = 'present' THEN 100.0 ELSE 0.0 END), 2) as average_attendance_rate,
                ROUND(SUM(duration_minutes) / 60.0, 2) as total_duration_hours,
                MAX(event_date) as most_recent_date,
                MIN(event_date) as oldest_date
            FROM attendance
        `);
        
        console.log(`📊 Found ${attendance.length} attendance records (${total} total)`);
        
        res.json({
            attendance,
            stats,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('❌ Get attendance error:', error);
        res.status(500).json({ error: 'Failed to get attendance records: ' + error.message });
    }
};

const getAttendanceSummary = async (req, res) => {
    try {
        console.log('📊 Getting attendance summary');
        
        const db = getDatabase();
        
        const summary = await db.all(`
            SELECT * FROM attendance_summary
            WHERE total_sessions > 0
            ORDER BY attendance_rate DESC
        `);
        
        res.json({ summary });
        
    } catch (error) {
        console.error('❌ Get attendance summary error:', error);
        res.status(500).json({ error: 'Failed to get attendance summary: ' + error.message });
    }
};

const createAttendance = async (req, res) => {
    try {
        const {
            player_id, session_id, event_type, event_date, event_title,
            status, check_in_time, check_out_time, notes
        } = req.body;
        
        console.log('📋 Creating attendance record:', req.body);
        
        // Validation
        if (!player_id || !event_date || !event_title || !event_type) {
            return res.status(400).json({
                error: 'Required fields: player_id, event_date, event_title, event_type'
            });
        }
        
        const db = getDatabase();
        
        // Verify player exists
        const player = await db.get('SELECT id FROM players WHERE id = ?', [player_id]);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        // Calculate duration if both check-in and check-out times are provided
        let duration = null;
        if (check_in_time && check_out_time) {
            const checkIn = new Date(check_in_time);
            const checkOut = new Date(check_out_time);
            duration = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60)); // minutes
        }
        
        const result = await db.run(`
            INSERT INTO attendance (
                player_id, session_id, event_type, event_date, event_title,
                status, check_in_time, check_out_time, duration_minutes, notes, marked_by_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            player_id,
            session_id || null,
            event_type,
            event_date,
            event_title,
            status || 'present',
            check_in_time || null,
            check_out_time || null,
            duration,
            notes || '',
            req.user.id
        ]);
        
        console.log('✅ Attendance record created with ID:', result.lastID);
        
        res.status(201).json({
            message: 'Attendance record created successfully',
            id: result.lastID
        });
        
    } catch (error) {
        console.error('❌ Create attendance error:', error);
        res.status(500).json({ error: 'Failed to create attendance record: ' + error.message });
    }
};

const updateAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status, check_in_time, check_out_time, notes
        } = req.body;
        
        console.log(`📋 Updating attendance ${id}:`, req.body);
        
        const db = getDatabase();
        
        // Check if attendance record exists
        const attendance = await db.get('SELECT * FROM attendance WHERE id = ?', [id]);
        if (!attendance) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }
        
        // Calculate duration if times are updated
        let duration = attendance.duration_minutes;
        const finalCheckIn = check_in_time || attendance.check_in_time;
        const finalCheckOut = check_out_time || attendance.check_out_time;
        
        if (finalCheckIn && finalCheckOut) {
            const checkIn = new Date(finalCheckIn);
            const checkOut = new Date(finalCheckOut);
            duration = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
        }
        
        const result = await db.run(`
            UPDATE attendance SET
                status = COALESCE(?, status),
                check_in_time = COALESCE(?, check_in_time),
                check_out_time = COALESCE(?, check_out_time),
                duration_minutes = ?,
                notes = COALESCE(?, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [status, check_in_time, check_out_time, duration, notes, id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }
        
        console.log('✅ Attendance record updated successfully');
        res.json({ message: 'Attendance record updated successfully' });
        
    } catch (error) {
        console.error('❌ Update attendance error:', error);
        res.status(500).json({ error: 'Failed to update attendance record: ' + error.message });
    }
};

const deleteAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`🗑️ Deleting attendance record ${id}`);
        
        const db = getDatabase();
        
        const result = await db.run('DELETE FROM attendance WHERE id = ?', [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }
        
        console.log('✅ Attendance record deleted successfully');
        res.json({ message: 'Attendance record deleted successfully' });
        
    } catch (error) {
        console.error('❌ Delete attendance error:', error);
        res.status(500).json({ error: 'Failed to delete attendance record: ' + error.message });
    }
};

const bulkCreateAttendance = async (req, res) => {
    try {
        const {
            player_ids, event_type, event_date, event_title, default_status = 'present'
        } = req.body;
        
        console.log('📋 Creating bulk attendance:', req.body);
        
        if (!player_ids || !Array.isArray(player_ids) || player_ids.length === 0) {
            return res.status(400).json({ error: 'player_ids array is required' });
        }
        
        if (!event_date || !event_title || !event_type) {
            return res.status(400).json({
                error: 'Required fields: event_date, event_title, event_type'
            });
        }
        
        const db = getDatabase();
        
        const results = [];
        
        for (const playerId of player_ids) {
            try {
                const result = await db.run(`
                    INSERT INTO attendance (
                        player_id, event_type, event_date, event_title, status, marked_by_user_id
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `, [playerId, event_type, event_date, event_title, default_status, req.user.id]);
                
                results.push({ player_id: playerId, id: result.lastID, success: true });
            } catch (error) {
                results.push({ player_id: playerId, success: false, error: error.message });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        
        console.log(`✅ Bulk attendance created: ${successCount}/${player_ids.length} records`);
        
        res.status(201).json({
            message: `Successfully created ${successCount} attendance records`,
            results,
            success_count: successCount,
            total_count: player_ids.length
        });
        
    } catch (error) {
        console.error('❌ Bulk create attendance error:', error);
        res.status(500).json({ error: 'Failed to create bulk attendance: ' + error.message });
    }
};

module.exports = {
    getAllAttendance,
    getAttendanceSummary,
    createAttendance,
    updateAttendance,
    deleteAttendance,
    bulkCreateAttendance
};