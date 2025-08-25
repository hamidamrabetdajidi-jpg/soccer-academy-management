const { getDatabase, initializeDatabase } = require('../config/database');

async function quickFix() {
    try {
        await initializeDatabase();
        const db = getDatabase();
        
        await db.exec(`
            CREATE TABLE IF NOT EXISTS player_valuations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                evaluator_id INTEGER NOT NULL,
                evaluation_date DATE NOT NULL,
                season_id INTEGER,
                matches_played INTEGER DEFAULT 0,
                goals_scored INTEGER DEFAULT 0,
                assists INTEGER DEFAULT 0,
                yellow_cards INTEGER DEFAULT 0,
                red_cards INTEGER DEFAULT 0,
                minutes_played INTEGER DEFAULT 0,
                technical_skills DECIMAL(3,1) NOT NULL,
                physical_skills DECIMAL(3,1) NOT NULL,
                mental_skills DECIMAL(3,1) NOT NULL,
                tactical_skills DECIMAL(3,1) NOT NULL,
                attacking_rating DECIMAL(3,1),
                defending_rating DECIMAL(3,1),
                goalkeeping_rating DECIMAL(3,1),
                overall_rating DECIMAL(3,1) NOT NULL,
                potential_rating DECIMAL(3,1) NOT NULL,
                market_value DECIMAL(10,2),
                strengths TEXT,
                weaknesses TEXT,
                development_notes TEXT,
                recommended_training TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (player_id) REFERENCES players(id),
                FOREIGN KEY (evaluator_id) REFERENCES users(id),
                FOREIGN KEY (season_id) REFERENCES seasons(id)
            );
        `);
        
        console.log('✅ Table created! Refresh your page.');
    } catch (error) {
        console.error('Error:', error);
    }
}

quickFix();