const { getDatabase, initializeDatabase } = require('../config/database');

async function fixTrainingSessionsTable() {
    try {
        console.log('🔧 Fixing training_sessions table...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Check if table exists
        const tableExists = await db.get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='training_sessions'
        `);
        
        if (!tableExists) {
            console.log('📊 Creating training_sessions table from scratch...');
            
            await db.exec(`
                CREATE TABLE training_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    session_date DATE,
                    start_time DATETIME,
                    end_time DATETIME,
                    field_id INTEGER,
                    coach_id INTEGER,
                    category_id INTEGER,
                    team_id INTEGER,
                    session_type VARCHAR(50) DEFAULT 'training',
                    objectives TEXT,
                    drills TEXT,
                    equipment_needed TEXT,
                    max_participants INTEGER,
                    is_mandatory BOOLEAN DEFAULT 0,
                    weather_conditions TEXT,
                    notes TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_by_user_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (field_id) REFERENCES fields(id),
                    FOREIGN KEY (coach_id) REFERENCES users(id),
                    FOREIGN KEY (team_id) REFERENCES teams(id),
                    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
                )
            `);
            
            console.log('✅ training_sessions table created');
            
        } else {
            console.log('📊 Table exists, checking structure...');
            
            // Get current columns
            const tableInfo = await db.all("PRAGMA table_info(training_sessions)");
            const existingColumns = tableInfo.map(col => col.name);
            
            console.log('📋 Existing columns:', existingColumns);
            
            // The table already has all the columns we need, so we're good
            console.log('✅ Table structure is correct');
        }
        
        // Create sample data if table is empty
        const count = await db.get('SELECT COUNT(*) as count FROM training_sessions WHERE is_active = 1');
        
        if (count.count === 0) {
            console.log('📋 Creating sample training sessions...');
            
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const dayAfter = new Date(today);
            dayAfter.setDate(today.getDate() + 2);
            
            const sampleSessions = [
                {
                    title: 'Morning Training Session',
                    description: 'Basic skills and fitness training',
                    session_date: today.toISOString().split('T')[0],
                    start_time: `${today.toISOString().split('T')[0]}T09:00:00`,
                    end_time: `${today.toISOString().split('T')[0]}T11:00:00`,
                    session_type: 'training',
                    objectives: 'Improve ball control and passing accuracy',
                    drills: 'Passing drills, cone work, small-sided games',
                    equipment_needed: 'Cones, balls, bibs',
                    max_participants: 25,
                    is_mandatory: 1,
                    notes: 'Focus on individual skills'
                },
                {
                    title: 'Tactical Session',
                    description: 'Formation and strategy practice',
                    session_date: tomorrow.toISOString().split('T')[0],
                    start_time: `${tomorrow.toISOString().split('T')[0]}T14:00:00`,
                    end_time: `${tomorrow.toISOString().split('T')[0]}T16:00:00`,
                    session_type: 'tactical',
                    objectives: 'Practice 4-3-3 formation',
                    drills: 'Formation drills, set pieces, scrimmage',
                    equipment_needed: 'Full field setup, goals',
                    max_participants: 22,
                    is_mandatory: 1,
                    notes: 'Work on pressing and counter-attacks'
                },
                {
                    title: 'Fitness Training',
                    description: 'Conditioning and endurance work',
                    session_date: dayAfter.toISOString().split('T')[0],
                    start_time: `${dayAfter.toISOString().split('T')[0]}T08:00:00`,
                    end_time: `${dayAfter.toISOString().split('T')[0]}T09:30:00`,
                    session_type: 'fitness',
                    objectives: 'Build cardiovascular endurance',
                    drills: 'Sprint intervals, circuit training',
                    equipment_needed: 'Weights, agility ladders, cones',
                    max_participants: 30,
                    is_mandatory: 0,
                    notes: 'High intensity interval training'
                }
            ];
            
            for (const session of sampleSessions) {
                await db.run(`
                    INSERT INTO training_sessions (
                        title, description, session_date, start_time, end_time,
                        session_type, objectives, drills, equipment_needed,
                        max_participants, is_mandatory, notes, created_by_user_id, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    session.title, session.description, session.session_date,
                    session.start_time, session.end_time, session.session_type,
                    session.objectives, session.drills, session.equipment_needed,
                    session.max_participants, session.is_mandatory, session.notes,
                    1, // Default to admin user
                    1  // is_active = true
                ]);
            }
            
            console.log('✅ Sample training sessions created');
        } else {
            console.log(`✅ Table already has ${count.count} training sessions`);
        }
        
        // Create indexes
        console.log('📊 Creating indexes...');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(session_date)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_training_sessions_type ON training_sessions(session_type)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_training_sessions_active ON training_sessions(is_active)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_training_sessions_user ON training_sessions(created_by_user_id)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_training_sessions_team ON training_sessions(team_id)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_training_sessions_field ON training_sessions(field_id)');
        
        console.log('✅ Training sessions table fixed successfully!');
        
        // Show final structure
        const finalTableInfo = await db.all("PRAGMA table_info(training_sessions)");
        console.log('\n📊 Final table structure:');
        finalTableInfo.forEach(col => {
            console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.pk ? '(PRIMARY KEY)' : ''}`);
        });
        
        // Show record count and samples
        const finalCount = await db.get('SELECT COUNT(*) as count FROM training_sessions WHERE is_active = 1');
        console.log(`\n📈 Active training sessions: ${finalCount.count}`);
        
        if (finalCount.count > 0) {
            const samples = await db.all(`
                SELECT id, title, session_date, session_type, start_time
                FROM training_sessions 
                WHERE is_active = 1 
                ORDER BY session_date 
                LIMIT 3
            `);
            
            console.log('\n🏃 Sample sessions:');
            samples.forEach(s => {
                console.log(`  - ${s.title} (${s.session_type}) - ${s.session_date} at ${s.start_time ? s.start_time.slice(11, 16) : 'No time'}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Failed to fix training_sessions table:', error);
        console.error('Error details:', error.message);
    }
}

fixTrainingSessionsTable();