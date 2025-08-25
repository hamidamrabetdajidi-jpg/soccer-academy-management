const { getDatabase, initializeDatabase } = require('../config/database');

async function setupTrainingSystem() {
    try {
        console.log('🏃‍♂️ Setting up Training Sessions system...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Step 1: Create fields table
        console.log('📍 Creating fields table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS fields (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                field_type VARCHAR(50) DEFAULT 'full_size',
                surface_type VARCHAR(50) DEFAULT 'grass',
                dimensions VARCHAR(100),
                capacity INTEGER DEFAULT 0,
                location VARCHAR(255),
                description TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Step 2: Create training sessions table
        console.log('🏃‍♂️ Creating training sessions table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS training_sessions (
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
                FOREIGN KEY (coach_id) REFERENCES users(id),
                FOREIGN KEY (category_id) REFERENCES categories(id),
                FOREIGN KEY (team_id) REFERENCES teams(id)
            )
        `);
        
        // Step 3: Create session attendance table
        console.log('👥 Creating session attendance table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS session_attendance (
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
        
        // Step 4: Create categories table if it doesn't exist
        console.log('📋 Creating categories table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                age_min INTEGER NOT NULL,
                age_max INTEGER NOT NULL,
                description TEXT,
                max_players INTEGER DEFAULT 25,
                training_frequency INTEGER DEFAULT 2,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Step 5: Create indexes
        console.log('📊 Creating indexes...');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_date ON training_sessions(session_date)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_coach ON training_sessions(coach_id)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_category ON training_sessions(category_id)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_team ON training_sessions(team_id)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_session ON session_attendance(session_id)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_player ON session_attendance(player_id)');
        
        console.log('✅ All tables created successfully!');
        
        // Step 6: Insert sample data
        await insertSampleData(db);
        
        console.log('🎉 Training Sessions system setup completed!');
        
    } catch (error) {
        console.error('❌ Failed to setup training system:', error);
        console.error('Error details:', error.message);
    }
}

async function insertSampleData(db) {
    try {
        console.log('📊 Inserting sample data...');
        
        // Insert sample fields
        const fieldCount = await db.get('SELECT COUNT(*) as count FROM fields');
        if (fieldCount.count === 0) {
            console.log('📍 Adding sample fields...');
            
            await db.run(`
                INSERT INTO fields (name, field_type, surface_type, dimensions, capacity, location, description)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['Main Field', 'full_size', 'grass', '100x50m', 50, 'North Campus', 'Primary training and match field']);
            
            await db.run(`
                INSERT INTO fields (name, field_type, surface_type, dimensions, capacity, location, description)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['Training Field A', 'half_size', 'artificial_turf', '50x30m', 25, 'East Campus', 'Small-sided games']);
            
            await db.run(`
                INSERT INTO fields (name, field_type, surface_type, dimensions, capacity, location, description)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['Indoor Hall', 'indoor', 'indoor', '30x20m', 30, 'Sports Complex', 'Weather backup facility']);
            
            console.log('✅ Sample fields added');
        }
        
        // Insert sample categories
        const categoryCount = await db.get('SELECT COUNT(*) as count FROM categories');
        if (categoryCount.count === 0) {
            console.log('📋 Adding sample categories...');
            
            await db.run(`
                INSERT INTO categories (name, age_min, age_max, description, max_players, training_frequency)
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['U8', 6, 8, 'Under 8 years old', 16, 2]);
            
            await db.run(`
                INSERT INTO categories (name, age_min, age_max, description, max_players, training_frequency)
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['U10', 9, 10, 'Under 10 years old', 18, 2]);
            
            await db.run(`
                INSERT INTO categories (name, age_min, age_max, description, max_players, training_frequency)
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['U12', 11, 12, 'Under 12 years old', 20, 3]);
            
            await db.run(`
                INSERT INTO categories (name, age_min, age_max, description, max_players, training_frequency)
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['U14', 13, 14, 'Under 14 years old', 22, 3]);
            
            await db.run(`
                INSERT INTO categories (name, age_min, age_max, description, max_players, training_frequency)
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['U16', 15, 16, 'Under 16 years old', 25, 4]);
            
            console.log('✅ Sample categories added');
        }
        
        // Insert sample coaches
        const coachCount = await db.get('SELECT COUNT(*) as count FROM users WHERE role = "coach"');
        if (coachCount.count === 0) {
            console.log('👨‍🏫 Adding sample coaches...');
            
            // Simple password for demo (in production, use proper hashing)
            const demoPassword = 'coach123';
            
            await db.run(`
                INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['coach1', 'john@academy.com', demoPassword, 'John', 'Smith', 'coach', 1]);
            
            await db.run(`
                INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['coach2', 'maria@academy.com', demoPassword, 'Maria', 'Garcia', 'coach', 1]);
            
            await db.run(`
                INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['coach3', 'david@academy.com', demoPassword, 'David', 'Johnson', 'coach', 1]);
            
            console.log('✅ Sample coaches added');
            console.log('📝 Demo coaches created (password: coach123)');
        }
        
        // Insert sample teams if they don't exist
        const teamCount = await db.get('SELECT COUNT(*) as count FROM teams');
        if (teamCount.length === 0 || teamCount.count === 0) {
            console.log('🏆 Adding sample teams...');
            
            // Get coach and category IDs
            const coach1 = await db.get('SELECT id FROM users WHERE username = "coach1"');
            const coach2 = await db.get('SELECT id FROM users WHERE username = "coach2"');
            const u12Category = await db.get('SELECT id FROM categories WHERE name = "U12"');
            const u14Category = await db.get('SELECT id FROM categories WHERE name = "U14"');
            
            if (coach1 && u12Category) {
                await db.run(`
                    INSERT OR IGNORE INTO teams (name, description, coach_id, category_id, is_active)
                    VALUES (?, ?, ?, ?, ?)
                `, ['Lions U12', 'Competitive U12 team', coach1.id, u12Category.id, 1]);
            }
            
            if (coach2 && u14Category) {
                await db.run(`
                    INSERT OR IGNORE INTO teams (name, description, coach_id, category_id, is_active)
                    VALUES (?, ?, ?, ?, ?)
                `, ['Eagles U14', 'Training U14 team', coach2.id, u14Category.id, 1]);
            }
            
            console.log('✅ Sample teams added');
        }
        
    } catch (error) {
        console.error('❌ Error inserting sample data:', error);
    }
}

setupTrainingSystem();