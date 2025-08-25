const { getDatabase } = require('../config/database');

const getAllTrainingSessions = async (req, res) => {
    try {
        const {
            search,
            session_type,
            start_date,
            end_date,
            location,
            sort_by = 'session_date',
            sort_order = 'desc',
            page = 1,
            limit = 20
        } = req.query;
        
        console.log('🏃 Getting training sessions with filters:', req.query);
        
        const db = getDatabase();
        
        // Use the actual column names from the database
        let query = `
            SELECT 
                ts.*,
                u.first_name || ' ' || u.last_name as created_by_name,
                t.name as team_name,
                f.name as field_name
            FROM training_sessions ts
            LEFT JOIN users u ON ts.created_by_user_id = u.id
            LEFT JOIN teams t ON ts.team_id = t.id
            LEFT JOIN fields f ON ts.field_id = f.id
            WHERE ts.is_active = 1
        `;
        
        const params = [];
        
        // Apply filters using correct column names
        if (search && search.trim() !== '') {
            query += ' AND (ts.title LIKE ? OR ts.description LIKE ? OR ts.objectives LIKE ?)';
            const searchTerm = `%${search.trim()}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        if (session_type && session_type !== '') {
            query += ' AND ts.session_type = ?';
            params.push(session_type);
        }
        
        if (start_date && start_date !== '') {
            query += ' AND DATE(ts.session_date) >= ?';
            params.push(start_date);
        }
        
        if (end_date && end_date !== '') {
            query += ' AND DATE(ts.session_date) <= ?';
            params.push(end_date);
        }
        
        // Sorting with correct column names
        const allowedSortFields = ['session_date', 'title', 'session_type', 'created_at'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'session_date';
        const sortDirection = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        
        query += ` ORDER BY ts.${sortField} ${sortDirection}`;
        
        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);
        
        console.log('🔍 Executing query:', query);
        
        const sessions = await db.all(query, params);
        
        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM training_sessions ts 
            WHERE ts.is_active = 1
        `;
        let countParams = [];
        
        // Apply the same filters for count
        if (search && search.trim() !== '') {
            countQuery += ' AND (ts.title LIKE ? OR ts.description LIKE ? OR ts.objectives LIKE ?)';
            const searchTerm = `%${search.trim()}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }
        
        if (session_type && session_type !== '') {
            countQuery += ' AND ts.session_type = ?';
            countParams.push(session_type);
        }
        
        if (start_date && start_date !== '') {
            countQuery += ' AND DATE(ts.session_date) >= ?';
            countParams.push(start_date);
        }
        
        if (end_date && end_date !== '') {
            countQuery += ' AND DATE(ts.session_date) <= ?';
            countParams.push(end_date);
        }
        
        const totalResult = await db.get(countQuery, countParams);
        const total = totalResult?.total || 0;
        
        console.log(`🏃 Found ${sessions.length} training sessions (${total} total)`);
        
        res.json({
            sessions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('❌ Get training sessions error:', error);
        res.status(500).json({ error: 'Failed to get training sessions: ' + error.message });
    }
};

const createTrainingSession = async (req, res) => {
    try {
        const {
            title, description, session_date, start_time, end_time,
            field_id, coach_id, category_id, team_id, session_type,
            objectives, drills, equipment_needed, max_participants,
            is_mandatory, weather_conditions, notes
        } = req.body;
        
        console.log('🏃 Creating training session:', req.body);
        
        // Validation
        if (!title || !session_date) {
            return res.status(400).json({
                error: 'Required fields: title, session_date'
            });
        }
        
        const db = getDatabase();
        
        // Use the current user as coach if no coach_id is provided
        const finalCoachId = coach_id || req.user.id;
        
        const result = await db.run(`
            INSERT INTO training_sessions (
                title, description, session_date, start_time, end_time,
                field_id, coach_id, category_id, team_id, session_type,
                objectives, drills, equipment_needed, max_participants,
                is_mandatory, weather_conditions, notes, created_by_user_id, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title, description, session_date, start_time, end_time,
            field_id || null, 
            finalCoachId, // Use current user as default coach
            category_id || null, 
            team_id || null, 
            session_type || 'training',
            objectives, drills, equipment_needed, max_participants || null,
            is_mandatory ? 1 : 0, weather_conditions, notes, req.user.id, 1
        ]);
        
        console.log('✅ Training session created with ID:', result.lastID);
        
        res.status(201).json({
            message: 'Training session created successfully',
            id: result.lastID
        });
        
    } catch (error) {
        console.error('❌ Create training session error:', error);
        res.status(500).json({ error: 'Failed to create training session: ' + error.message });
    }
};
const updateTrainingSession = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title, description, session_date, start_time, end_time,
            field_id, coach_id, category_id, team_id, session_type,
            objectives, drills, equipment_needed, max_participants,
            is_mandatory, weather_conditions, notes
        } = req.body;
        
        console.log(`🏃 Updating training session ${id}:`, req.body);
        
        const db = getDatabase();
        
        const result = await db.run(`
            UPDATE training_sessions SET
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                session_date = COALESCE(?, session_date),
                start_time = COALESCE(?, start_time),
                end_time = COALESCE(?, end_time),
                field_id = COALESCE(?, field_id),
                coach_id = COALESCE(?, coach_id),
                category_id = COALESCE(?, category_id),
                team_id = COALESCE(?, team_id),
                session_type = COALESCE(?, session_type),
                objectives = COALESCE(?, objectives),
                drills = COALESCE(?, drills),
                equipment_needed = COALESCE(?, equipment_needed),
                max_participants = COALESCE(?, max_participants),
                is_mandatory = COALESCE(?, is_mandatory),
                weather_conditions = COALESCE(?, weather_conditions),
                notes = COALESCE(?, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND is_active = 1
        `, [
            title, description, session_date, start_time, end_time,
            field_id, coach_id, category_id, team_id, session_type,
            objectives, drills, equipment_needed, max_participants,
            is_mandatory, weather_conditions, notes, id
        ]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Training session not found' });
        }
        
        console.log('✅ Training session updated successfully');
        res.json({ message: 'Training session updated successfully' });
        
    } catch (error) {
        console.error('❌ Update training session error:', error);
        res.status(500).json({ error: 'Failed to update training session: ' + error.message });
    }
};

const deleteTrainingSession = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`🗑️ Deleting training session ${id}`);
        
        const db = getDatabase();
        
        // Soft delete - set is_active to 0
        const result = await db.run(`
            UPDATE training_sessions 
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Training session not found' });
        }
        
        console.log('✅ Training session deleted successfully');
        res.json({ message: 'Training session deleted successfully' });
        
    } catch (error) {
        console.error('❌ Delete training session error:', error);
        res.status(500).json({ error: 'Failed to delete training session: ' + error.message });
    }
};

const createAttendanceForSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { player_ids = [], default_status = 'present' } = req.body;
        
        console.log(`📋 Creating attendance for training session ${id}`);
        console.log('📋 Player IDs:', player_ids);
        console.log('📋 Default status:', default_status);
        console.log('📋 User ID:', req.user.id);
        
        const db = getDatabase();
        
        // Get the training session details using correct column names
        const session = await db.get(`
            SELECT * FROM training_sessions WHERE id = ? AND is_active = 1
        `, [id]);
        
        if (!session) {
            return res.status(404).json({ error: 'Training session not found' });
        }
        
        console.log('📋 Found session:', session.title);
        
        // If no player_ids provided, get all active players
        let playersToMark = player_ids;
        if (playersToMark.length === 0) {
            const allPlayers = await db.all('SELECT id FROM players WHERE is_active = 1');
            playersToMark = allPlayers.map(p => p.id);
            console.log('📋 No players specified, using all active players:', playersToMark.length);
        }
        
        const results = [];
        const sessionDate = session.session_date ? 
            session.session_date.split('T')[0] : 
            new Date().toISOString().split('T')[0];
        
        console.log('📋 Using session date:', sessionDate);
        
        for (const playerId of playersToMark) {
            try {
                // Check if attendance already exists for this player and session
                const existingAttendance = await db.get(`
                    SELECT id FROM attendance 
                    WHERE player_id = ? AND session_id = ? AND event_date = ?
                `, [playerId, id, sessionDate]);
                
                if (existingAttendance) {
                    console.log(`⚠️ Attendance already exists for player ${playerId} - updating`);
                    
                    // Update existing record
                    await db.run(`
                        UPDATE attendance SET
                            status = ?,
                            notes = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `, [
                        default_status,
                        `Updated from training session: ${session.title}`,
                        existingAttendance.id
                    ]);
                    
                    results.push({ 
                        player_id: playerId, 
                        id: existingAttendance.id,
                        success: true,
                        action: 'updated'
                    });
                    continue;
                }
                
                // Create default check-in time if status is present or late
                let checkInTime = null;
                let checkOutTime = null;
                let duration = null;
                
                if (default_status === 'present' || default_status === 'late') {
                    // Create check-in time for the session date
                    const sessionDateTime = new Date(sessionDate);
                    
                    // Set time based on session start_time or default to 9:00 AM
                    if (session.start_time) {
                        const startTime = new Date(session.start_time);
                        sessionDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
                    } else {
                        sessionDateTime.setHours(9, 0, 0, 0); // Default 9 AM
                    }
                    
                    // Add slight delay for late arrivals
                    if (default_status === 'late') {
                        sessionDateTime.setMinutes(sessionDateTime.getMinutes() + 15);
                    }
                    
                    checkInTime = sessionDateTime.toISOString();
                    
                    // Calculate check-out time based on session duration
                    if (session.end_time && session.start_time) {
                        const startTime = new Date(session.start_time);
                        const endTime = new Date(session.end_time);
                        duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
                        
                        const checkOutDateTime = new Date(checkInTime);
                        checkOutDateTime.setMinutes(checkOutDateTime.getMinutes() + duration);
                        checkOutTime = checkOutDateTime.toISOString();
                    } else {
                        // Default 90 minute session
                        duration = 90;
                        const checkOutDateTime = new Date(checkInTime);
                        checkOutDateTime.setMinutes(checkOutDateTime.getMinutes() + duration);
                        checkOutTime = checkOutDateTime.toISOString();
                    }
                }
                
                // Insert new attendance record
                const result = await db.run(`
                    INSERT INTO attendance (
                        player_id, session_id, event_type, event_date, event_title, 
                        status, check_in_time, check_out_time, duration_minutes, 
                        notes, marked_by_user_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    playerId, 
                    id, 
                    'training', 
                    sessionDate,
                    session.title || `Training Session - ${sessionDate}`,
                    default_status,
                    checkInTime,
                    checkOutTime,
                    duration,
                    `Marked from training session: ${session.title}`,
                    req.user.id
                ]);
                
                console.log(`✅ Created attendance record ${result.lastID} for player ${playerId}`);
                
                results.push({ 
                    player_id: playerId, 
                    id: result.lastID, 
                    success: true,
                    action: 'created'
                });
                
            } catch (error) {
                console.error(`❌ Error creating attendance for player ${playerId}:`, error.message);
                results.push({ 
                    player_id: playerId, 
                    success: false, 
                    error: error.message 
                });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        const createdCount = results.filter(r => r.action === 'created').length;
        const updatedCount = results.filter(r => r.action === 'updated').length;
        
        console.log(`✅ Attendance creation completed: ${successCount} success (${createdCount} created, ${updatedCount} updated), ${failureCount} failed`);
        
        res.status(201).json({
            message: `Successfully processed attendance for ${successCount} players`,
            results,
            success_count: successCount,
            failure_count: failureCount,
            created_count: createdCount,
            updated_count: updatedCount,
            total_count: playersToMark.length
        });
        
    } catch (error) {
        console.error('❌ Create attendance for session error:', error);
        res.status(500).json({ error: 'Failed to create attendance: ' + error.message });
    }
};

const getSessionAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`📊 Getting attendance for training session ${id}`);
        
        const db = getDatabase();
        
        // Check what columns exist in players table
        const playersTableInfo = await db.all("PRAGMA table_info(players)");
        const playersColumns = playersTableInfo.map(col => col.name);
        
        console.log('📊 Available players columns:', playersColumns);
        
        // Get session details using correct column names
        const session = await db.get(`
            SELECT ts.*, u.first_name || ' ' || u.last_name as created_by_name
            FROM training_sessions ts
            LEFT JOIN users u ON ts.created_by_user_id = u.id
            WHERE ts.id = ? AND ts.is_active = 1
        `, [id]);
        
        if (!session) {
            return res.status(404).json({ error: 'Training session not found' });
        }
        
        console.log('📊 Found session:', session.title);
        
        // Build query based on available columns
        let playerSelectFields = [
            'p.first_name || \' \' || p.last_name as player_name',
            'p.email as player_email'
        ];
        
        if (playersColumns.includes('position')) {
            playerSelectFields.push('p.position');
        } else {
            playerSelectFields.push('\'\' as position');
        }
        
        if (playersColumns.includes('jersey_number')) {
            playerSelectFields.push('p.jersey_number');
        } else {
            playerSelectFields.push('NULL as jersey_number');
        }
        
        // Get attendance records for this session
        const attendance = await db.all(`
            SELECT 
                a.*,
                ${playerSelectFields.join(', ')},
                u.first_name || ' ' || u.last_name as marked_by_name
            FROM attendance a
            LEFT JOIN players p ON a.player_id = p.id
            LEFT JOIN users u ON a.marked_by_user_id = u.id
            WHERE a.session_id = ?
            ORDER BY p.first_name, p.last_name
        `, [id]);
        
        console.log(`📊 Found ${attendance.length} attendance records`);
        
        // Get attendance statistics
        const stats = {
            total_marked: attendance.length,
            present: attendance.filter(a => a.status === 'present').length,
            absent: attendance.filter(a => a.status === 'absent').length,
            late: attendance.filter(a => a.status === 'late').length,
            excused: attendance.filter(a => a.status === 'excused').length
        };
        
        // Calculate attendance rate (present + late / total marked * 100)
        stats.attendance_rate = stats.total_marked > 0 ? 
            (((stats.present + stats.late) / stats.total_marked) * 100).toFixed(1) : '0';
        
        // Get players not yet marked for attendance
        const markedPlayerIds = attendance.map(a => a.player_id);
        let unmarkedPlayers = [];
        
        // Build unmarked players query
        let unmarkedSelectFields = ['id', 'first_name', 'last_name'];
        if (playersColumns.includes('position')) {
            unmarkedSelectFields.push('position');
        } else {
            unmarkedSelectFields.push('\'\' as position');
        }
        if (playersColumns.includes('jersey_number')) {
            unmarkedSelectFields.push('jersey_number');
        } else {
            unmarkedSelectFields.push('NULL as jersey_number');
        }
        
        if (markedPlayerIds.length > 0) {
            unmarkedPlayers = await db.all(`
                SELECT ${unmarkedSelectFields.join(', ')}
                FROM players 
                WHERE is_active = 1 AND id NOT IN (${markedPlayerIds.map(() => '?').join(',')})
                ORDER BY first_name, last_name
            `, markedPlayerIds);
        } else {
            unmarkedPlayers = await db.all(`
                SELECT ${unmarkedSelectFields.join(', ')}
                FROM players 
                WHERE is_active = 1
                ORDER BY first_name, last_name
            `);
        }
        
        console.log(`📊 Found ${unmarkedPlayers.length} unmarked players`);
        
        res.json({
            session,
            attendance,
            stats,
            unmarked_players: unmarkedPlayers
        });
        
    } catch (error) {
        console.error('❌ Get session attendance error:', error);
        res.status(500).json({ error: 'Failed to get session attendance: ' + error.message });
    }
};
// Export all functions
module.exports = {
   getAllTrainingSessions,
   createTrainingSession,
   updateTrainingSession,
   deleteTrainingSession,
   createAttendanceForSession,
   getSessionAttendance
};