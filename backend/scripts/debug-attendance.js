const { getDatabase, initializeDatabase } = require('../config/database');

async function debugAttendance() {
    try {
        console.log('🔍 Debugging attendance system...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Check if tables exist
        const tables = await db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            ORDER BY name
        `);
        
        console.log('📊 Available tables:');
        tables.forEach(table => console.log('  -', table.name));
        
        // Check training_sessions table
        const sessions = await db.all('SELECT id, title FROM training_sessions LIMIT 5');
        console.log('\n🏃‍♂️ Training sessions:');
        sessions.forEach(session => console.log(`  - ID: ${session.id}, Title: ${session.title}`));
        
        // Check players table
        const players = await db.all('SELECT id, first_name, last_name FROM players LIMIT 5');
        console.log('\n👥 Players:');
        players.forEach(player => console.log(`  - ID: ${player.id}, Name: ${player.first_name} ${player.last_name}`));
        
        // Check session_attendance table structure
        try {
            const attendanceSchema = await db.all('PRAGMA table_info(session_attendance)');
            console.log('\n📋 session_attendance table structure:');
            attendanceSchema.forEach(col => console.log(`  - ${col.name}: ${col.type}`));
        } catch (error) {
            console.log('\n❌ session_attendance table does not exist');
        }
        
        // Test a simple query
        try {
            const testQuery = await db.all(`
                SELECT 
                    p.id as player_id,
                    p.first_name,
                    p.last_name
                FROM players p
                WHERE p.is_active = 1 
                LIMIT 3
            `);
            console.log('\n✅ Test query successful:', testQuery.length, 'players found');
        } catch (error) {
            console.log('\n❌ Test query failed:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

debugAttendance();