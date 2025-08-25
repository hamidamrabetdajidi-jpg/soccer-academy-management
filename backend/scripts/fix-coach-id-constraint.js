const { getDatabase, initializeDatabase } = require('../config/database');

async function fixCoachIdConstraint() {
    try {
        console.log('🔧 Fixing coach_id constraint...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Check current table structure
        const tableInfo = await db.all("PRAGMA table_info(training_sessions)");
        console.log('📊 Current table structure:', tableInfo.map(col => `${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''}`));
        
        // Since SQLite doesn't support ALTER COLUMN, we need to recreate the table
        console.log('📋 Creating new table with optional coach_id...');
        
        // Backup existing data
        const existingData = await db.all('SELECT * FROM training_sessions');
        console.log(`📦 Found ${existingData.length} existing sessions to preserve`);
        
        // Create new table with optional coach_id
        await db.exec(`
            CREATE TABLE training_sessions_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                session_date DATE,
                start_time DATETIME,
                end_time DATETIME,
                field_id INTEGER,
                coach_id INTEGER, -- Removed NOT NULL constraint
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
        
        // Migrate existing data
        if (existingData.length > 0) {
            console.log('📦 Migrating existing data...');
            
            for (const session of existingData) {
                await db.run(`
                    INSERT INTO training_sessions_new (
                        id, title, description, session_date, start_time, end_time,
                        field_id, coach_id, category_id, team_id, session_type,
                        objectives, drills, equipment_needed, max_participants,
                        is_mandatory, weather_conditions, notes, is_active,
                        created_by_user_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    session.id, session.title, session.description, session.session_date,
                    session.start_time, session.end_time, session.field_id,
                    session.coach_id || null, // Handle null coach_id
                    session.category_id, session.team_id, session.session_type,
                    session.objectives, session.drills, session.equipment_needed,
                    session.max_participants, session.is_mandatory, session.weather_conditions,
                    session.notes, session.is_active, session.created_by_user_id,
                    session.created_at, session.updated_at
                ]);
            }
        }
        
        // Drop old table and rename new one
        await db.exec('DROP TABLE training_sessions');
        await db.exec('ALTER TABLE training_sessions_new RENAME TO training_sessions');
        
        // Recreate indexes
        await db.exec('CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(session_date)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_training_sessions_type ON training_sessions(session_type)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_training_sessions_active ON training_sessions(is_active)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_training_sessions_user ON training_sessions(created_by_user_id)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_training_sessions_coach ON training_sessions(coach_id)');
        
        console.log('✅ coach_id constraint fixed successfully!');
        
        // Verify the fix
        const newTableInfo = await db.all("PRAGMA table_info(training_sessions)");
        const coachIdColumn = newTableInfo.find(col => col.name === 'coach_id');
        console.log('📊 coach_id column info:', coachIdColumn);
        
        const finalCount = await db.get('SELECT COUNT(*) as count FROM training_sessions');
        console.log(`📈 Final record count: ${finalCount.count}`);
        
    } catch (error) {
        console.error('❌ Failed to fix coach_id constraint:', error);
    }
}

fixCoachIdConstraint();