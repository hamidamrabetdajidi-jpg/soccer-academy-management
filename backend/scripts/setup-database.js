const { initializeDatabase, getDatabase } = require('../config/database');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
    try {
        console.log('🔧 Setting up database...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Create users table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'receptionist',
                phone VARCHAR(20),
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Create categories table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(50) NOT NULL UNIQUE,
                age_min INTEGER NOT NULL,
                age_max INTEGER NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Create players table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_number VARCHAR(20) UNIQUE NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                date_of_birth DATE NOT NULL,
                gender CHAR(1) NOT NULL CHECK (gender IN ('M', 'F')),
                street VARCHAR(255),
                city VARCHAR(100),
                state VARCHAR(100),
                postal_code VARCHAR(20),
                country VARCHAR(100) DEFAULT 'Morocco',
                phone VARCHAR(20),
                email VARCHAR(255),
                category_id INTEGER NOT NULL,
                tshirt_number INTEGER,
                medical_info TEXT,
                emergency_contact_name VARCHAR(255),
                emergency_contact_relationship VARCHAR(100),
                emergency_contact_phone VARCHAR(20),
                emergency_contact_email VARCHAR(255),
                photo_url VARCHAR(255),
                registration_date DATE NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id),
                UNIQUE(category_id, tshirt_number)
            );
        `);
        
        // Create seasons table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS seasons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Create teams table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                category_id INTEGER NOT NULL,
                coach_id INTEGER,
                season_id INTEGER,
                logo_url VARCHAR(255),
                primary_color VARCHAR(7) DEFAULT '#2c5530',
                secondary_color VARCHAR(7) DEFAULT '#5cb85c',
                formation VARCHAR(20) DEFAULT '4-4-2',
                description TEXT,
                founded_date DATE NOT NULL DEFAULT (date('now')),
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (category_id) REFERENCES categories(id),
                FOREIGN KEY (coach_id) REFERENCES users(id),
                FOREIGN KEY (season_id) REFERENCES seasons(id)
            );
        `);
        
        // Create team_players table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS team_players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER NOT NULL,
                player_id INTEGER NOT NULL,
                position VARCHAR(50),
                jersey_number INTEGER,
                is_captain BOOLEAN DEFAULT 0,
                is_vice_captain BOOLEAN DEFAULT 0,
                joined_date DATE NOT NULL DEFAULT (date('now')),
                left_date DATE,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (team_id) REFERENCES teams(id),
                FOREIGN KEY (player_id) REFERENCES players(id),
                UNIQUE(team_id, player_id),
                UNIQUE(team_id, jersey_number)
            );
        `);
        
        // Create indexes
        await db.exec(`
            CREATE INDEX IF NOT EXISTS idx_players_category ON players(category_id);
            CREATE INDEX IF NOT EXISTS idx_players_registration ON players(registration_number);
            CREATE INDEX IF NOT EXISTS idx_teams_category ON teams(category_id);
            CREATE INDEX IF NOT EXISTS idx_teams_coach ON teams(coach_id);
            CREATE INDEX IF NOT EXISTS idx_teams_season ON teams(season_id);
            CREATE INDEX IF NOT EXISTS idx_team_players_team ON team_players(team_id);
            CREATE INDEX IF NOT EXISTS idx_team_players_player ON team_players(player_id);
        `);
        
        // Insert default categories if not exists
        const categoriesExist = await db.get('SELECT COUNT(*) as count FROM categories');
        if (categoriesExist.count === 0) {
            await db.run(`
                INSERT INTO categories (name, age_min, age_max, description) VALUES
                ('U8', 6, 8, 'Under 8 years old'),
                ('U10', 8, 10, 'Under 10 years old'),
                ('U12', 10, 12, 'Under 12 years old'),
                ('U14', 12, 14, 'Under 14 years old'),
                ('U16', 14, 16, 'Under 16 years old'),
                ('U18', 16, 18, 'Under 18 years old'),
                ('Senior', 18, 99, 'Senior players')
            `);
            console.log('✅ Default categories created');
        }
        
        // Insert default season if not exists
        const seasonsExist = await db.get('SELECT COUNT(*) as count FROM seasons');
        if (seasonsExist.count === 0) {
            await db.run(`
                INSERT INTO seasons (name, start_date, end_date, description) VALUES
                ('2024-2025 Season', '2024-09-01', '2025-06-30', 'Soccer Academy Main Season')
            `);
            console.log('✅ Default season created');
        }
        
        // Insert default admin user if not exists
        const adminExists = await db.get('SELECT id FROM users WHERE username = ?', ['admin']);
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db.run(`
                INSERT INTO users (first_name, last_name, username, email, password_hash, role) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['Admin', 'User', 'admin', 'admin@soccerapp.com', hashedPassword, 'admin']);
            console.log('✅ Default admin user created (username: admin, password: admin123)');
        }
        
        console.log('✅ Database setup complete!');
        console.log('🏆 Teams table ready');
        console.log('📅 Seasons table ready');
        console.log('👥 Team players table ready');
        console.log('⚽ Players table ready');
        console.log('👤 Users table ready');
        console.log('📋 Categories table ready');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    }
}

setupDatabase();