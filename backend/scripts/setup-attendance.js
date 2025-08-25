const { getDatabase, initializeDatabase } = require('../config/database');

async function setupAttendanceSystem() {
    try {
        console.log('📋 Setting up Attendance Management System...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Create attendance table
        console.log('📊 Creating attendance table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                session_id INTEGER,
                event_type VARCHAR(50) NOT NULL DEFAULT 'training',
                event_date DATE NOT NULL,
                event_title VARCHAR(255) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'present',
                check_in_time DATETIME,
                check_out_time DATETIME,
                duration_minutes INTEGER,
                notes TEXT,
                marked_by_user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (player_id) REFERENCES players(id),
                FOREIGN KEY (session_id) REFERENCES training_sessions(id),
                FOREIGN KEY (marked_by_user_id) REFERENCES users(id)
            )
        `);
        
        // Create attendance patterns table (for tracking recurring attendance)
        console.log('📈 Creating attendance_patterns table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS attendance_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                day_of_week INTEGER NOT NULL,
                typical_status VARCHAR(20) DEFAULT 'present',
                attendance_rate DECIMAL(5,2) DEFAULT 100.00,
                last_calculated DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (player_id) REFERENCES players(id)
            )
        `);
        
        // Create attendance alerts table
        console.log('🚨 Creating attendance_alerts table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS attendance_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                alert_type VARCHAR(50) NOT NULL,
                alert_message TEXT NOT NULL,
                threshold_value INTEGER,
                is_active BOOLEAN DEFAULT 1,
                last_triggered DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (player_id) REFERENCES players(id)
            )
        `);
        
        // Create attendance summary view
        console.log('📊 Creating attendance summary views...');
        await db.exec(`
            CREATE VIEW IF NOT EXISTS attendance_summary AS
            SELECT 
                p.id as player_id,
                p.first_name || ' ' || p.last_name as player_name,
                p.email,
                COUNT(a.id) as total_sessions,
                COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
                COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
                COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
                COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_count,
                ROUND(
                    (COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0) / 
                    NULLIF(COUNT(a.id), 0), 2
                ) as attendance_rate,
                MAX(a.event_date) as last_attendance_date,
                AVG(a.duration_minutes) as avg_duration_minutes
            FROM players p
            LEFT JOIN attendance a ON p.id = a.player_id
            GROUP BY p.id, p.first_name, p.last_name, p.email
        `);
        
        // Check if we have existing attendance data
        const attendanceCount = await db.get('SELECT COUNT(*) as count FROM attendance');
        if (attendanceCount.count === 0) {
            console.log('📋 Creating sample attendance records...');
            
            // Get some players for sample data
            const players = await db.all('SELECT id, first_name, last_name FROM players LIMIT 5');
            
            if (players.length === 0) {
                console.log('⚠️ No players found, creating sample players first...');
                
                // Create sample players
                const samplePlayers = [
                    ['John', 'Doe', 'john.doe@email.com', '1995-03-15', 'midfielder'],
                    ['Jane', 'Smith', 'jane.smith@email.com', '1997-07-22', 'forward'],
                    ['Mike', 'Johnson', 'mike.johnson@email.com', '1996-11-08', 'defender'],
                    ['Sarah', 'Wilson', 'sarah.wilson@email.com', '1998-01-30', 'goalkeeper'],
                    ['Alex', 'Brown', 'alex.brown@email.com', '1995-09-12', 'midfielder']
                ];
                
                for (const player of samplePlayers) {
                    await db.run(`
                        INSERT INTO players (first_name, last_name, email, date_of_birth, position)
                        VALUES (?, ?, ?, ?, ?)
                    `, player);
                }
                
                console.log('✅ Sample players created');
                
                // Re-fetch players
                const newPlayers = await db.all('SELECT id, first_name, last_name FROM players LIMIT 5');
                players.push(...newPlayers);
            }
            
            // Check if training_sessions table exists and what columns it has
            let sessionColumns = [];
            try {
                const tableInfo = await db.all("PRAGMA table_info(training_sessions)");
                sessionColumns = tableInfo.map(col => col.name);
                console.log('📊 Training sessions table columns:', sessionColumns);
            } catch (error) {
                console.log('⚠️ Training sessions table does not exist');
            }
            
            // Get training sessions if they exist
            let sessions = [];
            if (sessionColumns.length > 0) {
                try {
                    // Try different possible column names for date
                    let dateColumn = 'created_at'; // fallback
                    if (sessionColumns.includes('date')) {
                        dateColumn = 'date';
                    } else if (sessionColumns.includes('session_date')) {
                        dateColumn = 'session_date';
                    } else if (sessionColumns.includes('scheduled_date')) {
                        dateColumn = 'scheduled_date';
                    }
                    
                    sessions = await db.all(`SELECT id, title, ${dateColumn} as date FROM training_sessions LIMIT 3`);
                    console.log('🏃 Found training sessions:', sessions.length);
                } catch (error) {
                    console.log('⚠️ Could not fetch training sessions:', error.message);
                    sessions = [];
                }
            }
            
            // Create sample attendance data
            const today = new Date();
            const attendanceStatuses = ['present', 'absent', 'late', 'excused'];
            const eventTypes = ['training', 'match', 'tournament'];
            
            console.log(`📋 Creating attendance records for ${players.length} players...`);
            
            // Create attendance for the last 30 days
            for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
                const eventDate = new Date(today);
                eventDate.setDate(today.getDate() - dayOffset);
                
                // Skip weekends for some variety
                if (dayOffset % 7 === 0 || dayOffset % 7 === 6) continue;
                
                for (const player of players) {
                    // 75% chance of having attendance record for this day
                    if (Math.random() < 0.25) continue;
                    
                    // 85% chance of being present
                    const willAttend = Math.random() < 0.85;
                    let status = 'present';
                    
                    if (!willAttend) {
                        status = attendanceStatuses[Math.floor(Math.random() * attendanceStatuses.length)];
                    }
                    
                    // Random event type
                    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
                    
                    // Create event title
                    const eventTitle = eventType === 'training' 
                        ? `Training Session - ${eventDate.toLocaleDateString()}`
                        : eventType === 'match'
                        ? `Match vs Team ${Math.floor(Math.random() * 10) + 1}`
                        : `Tournament Day ${Math.floor(Math.random() * 3) + 1}`;
                    
                    // Create check-in/out times for present/late status
                    let checkInTime = null;
                    let checkOutTime = null;
                    let duration = null;
                    
                    if (status === 'present' || status === 'late') {
                        // Training usually starts at 9 AM, but late arrivals come later
                        const baseStartHour = 9;
                        const startHour = status === 'late' ? baseStartHour + (Math.random() * 0.5) : baseStartHour;
                        const startMinute = Math.floor(Math.random() * 60);
                        
                        checkInTime = new Date(eventDate);
                        checkInTime.setHours(Math.floor(startHour), startMinute, 0, 0);
                        
                        // Training duration: 90-120 minutes
                        const durationMinutes = 90 + Math.floor(Math.random() * 30);
                        checkOutTime = new Date(checkInTime.getTime() + durationMinutes * 60 * 1000);
                        duration = durationMinutes;
                    }
                    
                    // Insert attendance record
                    try {
                        await db.run(`
                            INSERT INTO attendance (
                                player_id, event_type, event_date, event_title, status,
                                check_in_time, check_out_time, duration_minutes, 
                                notes, marked_by_user_id
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            player.id,
                            eventType,
                            eventDate.toISOString().split('T')[0],
                            eventTitle,
                            status,
                            checkInTime ? checkInTime.toISOString() : null,
                            checkOutTime ? checkOutTime.toISOString() : null,
                            duration,
                            status === 'absent' ? 'No show' : (status === 'late' ? 'Arrived late' : 'Regular attendance'),
                            1 // admin user
                        ]);
                    } catch (error) {
                        console.error(`❌ Error creating attendance for player ${player.id}:`, error.message);
                    }
                }
            }
            
            console.log('✅ Sample attendance records created');
        }
        
        // Create indexes for better performance
        console.log('📊 Creating indexes...');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_player ON attendance(player_id)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(event_date)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_type ON attendance(event_type)');
        
        console.log('✅ Attendance Management System setup completed!');
        
        // Show summary
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
                COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused_count,
                ROUND(AVG(duration_minutes), 2) as avg_duration,
                COUNT(DISTINCT player_id) as unique_players,
                COUNT(DISTINCT event_date) as unique_dates
            FROM attendance
        `);
        
        console.log('\n📋 Attendance System Summary:');
        console.log(`  - Total Records: ${stats.total_records}`);
        console.log(`  - Present: ${stats.present_count}`);
        console.log(`  - Absent: ${stats.absent_count}`);
        console.log(`  - Late: ${stats.late_count}`);
        console.log(`  - Excused: ${stats.excused_count}`);
        console.log(`  - Average Duration: ${stats.avg_duration} minutes`);
        console.log(`  - Unique Players: ${stats.unique_players}`);
        console.log(`  - Unique Dates: ${stats.unique_dates}`);
        
        // Show attendance summary by player
        const playerStats = await db.all(`
            SELECT 
                player_name,
                total_sessions,
                present_count,
                attendance_rate
            FROM attendance_summary
            WHERE total_sessions > 0
            ORDER BY attendance_rate DESC
            LIMIT 5
        `);
        
        console.log('\n👥 Top Attendance (Sample):');
        playerStats.forEach(ps => {
            console.log(`  - ${ps.player_name}: ${ps.attendance_rate}% (${ps.present_count}/${ps.total_sessions})`);
        });
        
    } catch (error) {
        console.error('❌ Failed to setup attendance system:', error);
        console.error('Error details:', error.message);
    }
}

setupAttendanceSystem();