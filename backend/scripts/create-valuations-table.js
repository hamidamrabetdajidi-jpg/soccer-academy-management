const { getDatabase, initializeDatabase } = require('../config/database');

async function createValuationsTable() {
    try {
        console.log('🔧 Creating player valuations table...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Create player valuations table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS player_valuations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                evaluator_id INTEGER NOT NULL,
                evaluation_date DATE NOT NULL,
                season_id INTEGER,
                
                -- Performance metrics
                matches_played INTEGER DEFAULT 0,
                goals_scored INTEGER DEFAULT 0,
                assists INTEGER DEFAULT 0,
                yellow_cards INTEGER DEFAULT 0,
                red_cards INTEGER DEFAULT 0,
                minutes_played INTEGER DEFAULT 0,
                
                -- Skill ratings (1-10)
                technical_skills DECIMAL(3,1) NOT NULL,
                physical_skills DECIMAL(3,1) NOT NULL,
                mental_skills DECIMAL(3,1) NOT NULL,
                tactical_skills DECIMAL(3,1) NOT NULL,
                
                -- Position-specific ratings
                attacking_rating DECIMAL(3,1),
                defending_rating DECIMAL(3,1),
                goalkeeping_rating DECIMAL(3,1),
                
                -- Overall ratings
                overall_rating DECIMAL(3,1) NOT NULL,
                potential_rating DECIMAL(3,1) NOT NULL,
                market_value DECIMAL(10,2),
                
                -- Qualitative data
                strengths TEXT,
                weaknesses TEXT,
                development_notes TEXT,
                recommended_training TEXT,
                
                -- Status
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (player_id) REFERENCES players(id),
                FOREIGN KEY (evaluator_id) REFERENCES users(id),
                FOREIGN KEY (season_id) REFERENCES seasons(id)
            );
        `);
        
        // Create indexes
        await db.exec(`
            CREATE INDEX IF NOT EXISTS idx_valuations_player ON player_valuations(player_id);
            CREATE INDEX IF NOT EXISTS idx_valuations_evaluator ON player_valuations(evaluator_id);
            CREATE INDEX IF NOT EXISTS idx_valuations_date ON player_valuations(evaluation_date);
            CREATE INDEX IF NOT EXISTS idx_valuations_rating ON player_valuations(overall_rating);
        `);
        
        console.log('✅ Player valuations table created successfully!');
        
        // Verify table creation
        const tableInfo = await db.all('PRAGMA table_info(player_valuations)');
        console.log('📋 Table columns created:', tableInfo.map(col => col.name));
        
    } catch (error) {
        console.error('❌ Failed to create valuations table:', error);
        process.exit(1);
    }
}

createValuationsTable();