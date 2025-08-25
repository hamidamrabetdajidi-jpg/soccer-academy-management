const { getDatabase, initializeDatabase } = require('../config/database');

async function setupAttendanceFromScratch() {
    try {
        console.log('🧹 Setting up attendance system from scratch...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Step 1: Create session_attendance table
        console.log('📋 Creating session_attendance table...');
        await db.exec(`
            DROP TABLE IF EXISTS session_attendance;
            
            CREATE TABLE session_attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                player_id INTEGER NOT NULL,
                attendance_status TEXT DEFAULT 'absent',
                arrival_time TEXT,
                coach_notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (session_id) REFERENCES training_sessions(id),
                FOREIGN KEY (player_id) REFERENCES players(id),
                UNIQUE(session_id, player_id)
            );
        `);
        
        // Step 2: Create sample players if none exist
        const playerCount = await db.get('SELECT COUNT(*) as count FROM players');
        if (playerCount.count === 0) {
            console.log('👥 Creating sample players...');
            
            const players = [
                ['John', 'Doe', '2010-05-15', 'M', 'P001'],
                ['Emma', 'Smith', '2011-03-22', 'F', 'P002'],
                ['Michael', 'Johnson', '2010-08-10', 'M', 'P003'],
                ['Sarah', 'Williams', '2011-12-05', 'F', 'P004'],
                ['David', 'Brown', '2010-01-30', 'M', 'P005']
            ];
            
            for (const [firstName, lastName, birthDate, gender, regNumber] of players) {
                await db.run(`
                    INSERT INTO players (
                        first_name, last_name, birth_date, gender, 
                        registration_number, is_active, category_id
                    ) VALUES (?, ?, ?, ?, ?, 1, 2)
                `, [firstName, lastName, birthDate, gender, regNumber]);
            }
            
            console.log('✅ Sample players created');
        }
        
        console.log('🎉 Attendance system setup completed!');
        
        // Show what we have
        const sessions = await db.all('SELECT id, title FROM training_sessions LIMIT 3');
        const players = await db.all('SELECT id, first_name, last_name FROM players LIMIT 5');
        
        console.log('\n📊 Available sessions:');
        sessions.forEach(s => console.log(`  - ${s.id}: ${s.title}`));
        
        console.log('\n👥 Available players:');
        players.forEach(p => console.log(`  - ${p.id}: ${p.first_name} ${p.last_name}`));
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
    }
}

setupAttendanceFromScratch();