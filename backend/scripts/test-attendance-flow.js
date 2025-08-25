const { getDatabase, initializeDatabase } = require('../config/database');

async function testAttendanceFlow() {
  try {
        console.log('🧪 Testing attendance flow...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Check available columns
        const playersTableInfo = await db.all("PRAGMA table_info(players)");
        const playersColumns = playersTableInfo.map(col => col.name);
        console.log('📊 Available players columns:', playersColumns);
        
        // Get a training session
        const session = await db.get('SELECT * FROM training_sessions WHERE is_active = 1 LIMIT 1');
        if (!session) {
            console.log('❌ No training sessions found');
            return;
        }
        
        console.log('📋 Testing with session:', session.title);
        
        // Get some players
        const players = await db.all('SELECT * FROM players WHERE is_active = 1 LIMIT 3');
        console.log('👥 Testing with players:', players.map(p => `${p.first_name} ${p.last_name}`));
        
        // Simulate creating attendance
        const sessionDate = session.session_date ? 
            session.session_date.split('T')[0] : 
            new Date().toISOString().split('T')[0];
        
        for (const player of players) {
            // Check if attendance already exists
            const existing = await db.get(`
                SELECT id FROM attendance 
                WHERE player_id = ? AND session_id = ? AND event_date = ?
            `, [player.id, session.id, sessionDate]);
            
            if (!existing) {
                await db.run(`
                    INSERT INTO attendance (
                        player_id, session_id, event_type, event_date, event_title,
                        status, check_in_time, notes, marked_by_user_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    player.id, session.id, 'training', sessionDate, session.title,
                    'present', new Date().toISOString(), 'Test attendance record', 1
                ]);
                
                console.log(`✅ Created test attendance for ${player.first_name} ${player.last_name}`);
            } else {
                console.log(`⚠️ Attendance already exists for ${player.first_name} ${player.last_name}`);
            }
        }
        
        // Build query based on available columns
        let selectFields = [
            'a.*',
            'p.first_name || \' \' || p.last_name as player_name'
        ];
        
        if (playersColumns.includes('position')) {
            selectFields.push('p.position');
        } else {
            selectFields.push('\'\' as position');
        }
        
        // Query attendance for the session
        const attendance = await db.all(`
            SELECT ${selectFields.join(', ')}
            FROM attendance a
            LEFT JOIN players p ON a.player_id = p.id
            WHERE a.session_id = ?
            ORDER BY p.first_name, p.last_name
        `, [session.id]);
        
        console.log('\n📊 Attendance records for session:');
        attendance.forEach(record => {
            console.log(`  - ${record.player_name} (${record.status}) - ${record.event_date} - Position: ${record.position || 'N/A'}`);
        });
        
        // Calculate statistics
        const stats = {
            total_marked: attendance.length,
            present: attendance.filter(a => a.status === 'present').length,
            absent: attendance.filter(a => a.status === 'absent').length,
            late: attendance.filter(a => a.status === 'late').length,
            excused: attendance.filter(a => a.status === 'excused').length
        };
        
        console.log('\n📈 Statistics:', stats);
        
        console.log('✅ Attendance flow test completed successfully!');
        
    } catch (error) {
        console.error('❌ Attendance flow test failed:', error);
    }
}

testAttendanceFlow();