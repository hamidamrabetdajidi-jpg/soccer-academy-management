const { getDatabase, initializeDatabase } = require('../config/database');

async function migrateTeamsTable() {
    try {
        console.log('🔄 Migrating teams table...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Drop and recreate the teams table with correct schema
        await db.exec(`DROP TABLE IF EXISTS teams`);
        
        // Create teams table with correct columns
        await db.exec(`
            CREATE TABLE teams (
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
        
        // Also ensure team_players table exists with correct schema
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
        
        // Create indexes for better performance
        await db.exec(`
            CREATE INDEX IF NOT EXISTS idx_teams_category ON teams(category_id);
            CREATE INDEX IF NOT EXISTS idx_teams_coach ON teams(coach_id);
            CREATE INDEX IF NOT EXISTS idx_teams_season ON teams(season_id);
            CREATE INDEX IF NOT EXISTS idx_team_players_team ON team_players(team_id);
            CREATE INDEX IF NOT EXISTS idx_team_players_player ON team_players(player_id);
        `);
        
        console.log('✅ Teams table migrated successfully!');
        console.log('📋 New teams table structure:');
        
        const columns = await db.all('PRAGMA table_info(teams)');
        columns.forEach(col => {
            console.log(`   - ${col.name} (${col.type})`);
        });
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

migrateTeamsTable();