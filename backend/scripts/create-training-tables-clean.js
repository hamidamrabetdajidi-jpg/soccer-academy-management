const { getDatabase, initializeDatabase } = require('../config/database');

async function createTrainingTables() {
    try {
        console.log('🏃‍♂️ Creating training sessions tables...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Drop existing tables if they exist to start fresh
        console.log('🧹 Cleaning up existing tables...');
        await db.exec('DROP TABLE IF EXISTS session_attendance');
        await db.exec('DROP TABLE IF EXISTS training_drills');
        await db.exec('DROP TABLE IF EXISTS training_sessions');
        await db.exec('DROP TABLE IF EXISTS fields');
        
        // Create fields table first (no dependencies)
        console.log('📍 Creating fields table...');
        await db.exec(`
            CREATE TABLE fields (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                field_type VARCHAR(50) DEFAULT 'full_size',
                surface_type VARCHAR(50) DEFAULT 'grass',
                dimensions VARCHAR(100),
                capacity INTEGER DEFAULT 0,
                location VARCHAR(255),
                description TEXT,
                facilities TEXT,
                maintenance_status VARCHAR(50) DEFAULT 'good',
                last_maintenance_date TEXT,
                next_maintenance_date TEXT,
                hourly_rate DECIMAL(10,2),
                availability_schedule TEXT,
                booking_rules TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Fields table created');
        
        // Create training sessions table
        console.log('🏃‍♂️ Creating training sessions table...');
        await db.exec(`
            CREATE TABLE training_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                session_date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                field_id INTEGER,
                coach_id INTEGER NOT NULL,
                category_id INTEGER,
                team_id INTEGER,
                session_type VARCHAR(50) DEFAULT 'training',
                objectives TEXT,
                drills TEXT,
                equipment_needed TEXT,
                max_participants INTEGER,
                is_mandatory BOOLEAN DEFAULT 1,
                weather_conditions VARCHAR(100),
                notes TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (field_id) REFERENCES fields(id),
                FOREIGN KEY (coach_id) REFERENCES users(id)
            )
        `);
        console.log('✅ Training sessions table created');
        
        // Create session attendance table
        console.log('👥 Creating session attendance table...');
        await db.exec(`
            CREATE TABLE session_attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                player_id INTEGER NOT NULL,
                attendance_status VARCHAR(20) DEFAULT 'absent',
                arrival_time TEXT,
                departure_time TEXT,
                late_minutes INTEGER DEFAULT 0,
                performance_rating DECIMAL(3,1),
                coach_notes TEXT,
                player_notes TEXT,
                excuse_reason TEXT,
                recorded_by_user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (session_id) REFERENCES training_sessions(id),
                FOREIGN KEY (player_id) REFERENCES players(id),
                FOREIGN KEY (recorded_by_user_id) REFERENCES users(id),
                UNIQUE(session_id, player_id)
            )
        `);
        console.log('✅ Session attendance table created');
        
        // Create training drills table
        console.log('🏋️ Creating training drills table...');
        await db.exec(`
            CREATE TABLE training_drills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                duration_minutes INTEGER DEFAULT 0,
                equipment TEXT,
                objectives TEXT,
                difficulty_level VARCHAR(20) DEFAULT 'beginner',
                drill_type VARCHAR(20) DEFAULT 'technical',
                order_in_session INTEGER DEFAULT 1,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (session_id) REFERENCES training_sessions(id)
            )
        `);
        console.log('✅ Training drills table created');
        
        // Create indexes
        console.log('📊 Creating indexes...');
        await db.exec('CREATE INDEX idx_sessions_date ON training_sessions(session_date)');
        await db.exec('CREATE INDEX idx_sessions_coach ON training_sessions(coach_id)');
        await db.exec('CREATE INDEX idx_sessions_category ON training_sessions(category_id)');
        await db.exec('CREATE INDEX idx_sessions_team ON training_sessions(team_id)');
        await db.exec('CREATE INDEX idx_attendance_session ON session_attendance(session_id)');
        await db.exec('CREATE INDEX idx_attendance_player ON session_attendance(player_id)');
        await db.exec('CREATE INDEX idx_drills_session ON training_drills(session_id)');
        console.log('✅ Indexes created');
        
        // Insert sample fields
        console.log('📍 Adding sample fields...');
        await db.run(`
            INSERT INTO fields (name, field_type, surface_type, dimensions, capacity, location, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, ['Main Field', 'full_size', 'grass', '100x50m', 50, 'North Campus', 'Primary training and match field']);
        
        await db.run(`
            INSERT INTO fields (name, field_type, surface_type, dimensions, capacity, location, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, ['Training Field A', 'half_size', 'artificial_turf', '50x30m', 25, 'East Campus', 'Small-sided games and drills']);
        
        await db.run(`
            INSERT INTO fields (name, field_type, surface_type, dimensions, capacity, location, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, ['Training Field B', 'small_sided', 'artificial_turf', '40x25m', 20, 'East Campus', 'Youth training']);
        
        await db.run(`
            INSERT INTO fields (name, field_type, surface_type, dimensions, capacity, location, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, ['Indoor Hall', 'indoor', 'indoor', '30x20m', 30, 'Sports Complex', 'Weather backup facility']);
        
        console.log('✅ Sample fields added');
        
        // Verify table creation
        const tables = await db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN ('training_sessions', 'session_attendance', 'training_drills', 'fields')
            ORDER BY name
        `);
        
        console.log('📋 Training tables created:', tables.map(t => t.name));
        console.log('🎉 All training session tables created successfully!');
        
    } catch (error) {
        console.error('❌ Failed to create training tables:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

createTrainingTables();