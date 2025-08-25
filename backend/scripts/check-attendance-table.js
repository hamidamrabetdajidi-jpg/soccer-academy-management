const { getDatabase, initializeDatabase } = require('../config/database');

async function checkAttendanceTable() {
    try {
        console.log('🔍 Checking attendance table structure...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Check if table exists
        const tableExists = await db.get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='attendance'
        `);
        
        if (!tableExists) {
            console.log('❌ attendance table does not exist, creating it...');
            
            await db.exec(`
                CREATE TABLE attendance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    player_id INTEGER NOT NULL,
                    session_id INTEGER,
                    event_type VARCHAR(50) DEFAULT 'training',
                    event_date DATE NOT NULL,
                    event_title VARCHAR(255),
                    status VARCHAR(20) DEFAULT 'present',
                    check_in_time DATETIME,
                    check_out_time DATETIME,
                    duration_minutes INTEGER,
                    notes TEXT,
                    marked_by_user_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (player_id) REFERENCES players(id),
                    FOREIGN KEY (session_id) REFERENCES training_sessions(id),
                    FOREIGN KEY (marked_by_user_id) REFERENCES users(id)
                )
            `);
            
            console.log('✅ attendance table created');
        } else {
            console.log('✅ attendance table exists');
        }
        
        // Get table info
        const tableInfo = await db.all("PRAGMA table_info(attendance)");
        console.log('📊 Attendance table columns:');
        tableInfo.forEach(col => {
            console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.pk ? '(PRIMARY KEY)' : ''}`);
        });
        
        // Check existing records
        const count = await db.get('SELECT COUNT(*) as count FROM attendance');
        console.log(`📈 Total attendance records: ${count.count}`);
        
        // Show sample records
        if (count.count > 0) {
            const samples = await db.all(`
                SELECT a.*, p.first_name || ' ' || p.last_name as player_name
                FROM attendance a
                LEFT JOIN players p ON a.player_id = p.id
                ORDER BY a.created_at DESC
                LIMIT 5
            `);
            
            console.log('\n📋 Sample attendance records:');
            samples.forEach(record => {
                console.log(`  - ${record.player_name} (${record.status}) - ${record.event_date} - Session: ${record.session_id}`);
            });
        }
        
        // Create indexes
        await db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_player ON attendance(player_id)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(event_date)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status)');
        
        console.log('✅ Attendance table check completed');
        
    } catch (error) {
        console.error('❌ Error checking attendance table:', error);
    }
}

checkAttendanceTable();