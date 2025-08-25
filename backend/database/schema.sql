-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK(role IN ('admin', 'manager', 'coach', 'receptionist')) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Players table
DROP TABLE IF EXISTS players;
CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(1) CHECK(gender IN ('M', 'F')) NOT NULL,
    
    -- Address fields
    street TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    phone VARCHAR(20),
    email VARCHAR(100),
    category_id INTEGER NOT NULL,
    tshirt_number INTEGER,
    photo_url VARCHAR(255),
    medical_info TEXT,
    
    -- Emergency contact
    emergency_contact_name VARCHAR(100) NOT NULL,
    emergency_contact_relationship VARCHAR(50) NOT NULL,
    emergency_contact_phone VARCHAR(20) NOT NULL,
    emergency_contact_email VARCHAR(100),
    
    registration_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(id),
    UNIQUE(category_id, tshirt_number) -- Unique t-shirt number per category
);

-- Seasons table
CREATE TABLE IF NOT EXISTS seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Insert default season
INSERT OR IGNORE INTO seasons (name, start_date, end_date, description) VALUES
('2024-2025 Season', '2024-09-01', '2025-06-30', 'Soccer Academy Main Season');

-- Teams table
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
    founded_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (coach_id) REFERENCES users(id),
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    UNIQUE(name, category_id, season_id)
);
-- Team players (many-to-many relationship)
CREATE TABLE IF NOT EXISTS team_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    position VARCHAR(50),
    jersey_number INTEGER,
    is_captain BOOLEAN DEFAULT 0,
    is_vice_captain BOOLEAN DEFAULT 0,
    joined_date DATE NOT NULL,
    left_date DATE,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (player_id) REFERENCES players(id),
    UNIQUE(team_id, player_id),
    UNIQUE(team_id, jersey_number)
);
-- Training Sessions table
CREATE TABLE IF NOT EXISTS training_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    coach_id INTEGER NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(100),
    description TEXT,
    status VARCHAR(20) CHECK(status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (coach_id) REFERENCES users(id)
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT OR IGNORE INTO settings (setting_key, setting_value, description) VALUES
('academy_name', 'Soccer Academy', 'Name of the academy'),
('academy_address', '', 'Academy address'),
('academy_phone', '', 'Academy contact phone'),
('academy_email', '', 'Academy contact email'),
('currency', 'USD', 'Default currency for fees');

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (username, email, password_hash, role, first_name, last_name) VALUES
('admin', 'admin@academy.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'System', 'Administrator');
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    age_min INTEGER NOT NULL,
    age_max INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT OR IGNORE INTO categories (name, age_min, age_max, description) VALUES
('U8', 6, 8, 'Under 8 years old'),
('U10', 8, 10, 'Under 10 years old'),
('U12', 10, 12, 'Under 12 years old'),
('U14', 12, 14, 'Under 14 years old'),
('U16', 14, 16, 'Under 16 years old'),
('U18', 16, 18, 'Under 18 years old'),
('Senior', 18, 99, 'Senior players (18+)');
-- Create indexes
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teams_category ON teams(category_id);
CREATE INDEX IF NOT EXISTS idx_teams_coach ON teams(coach_id);
CREATE INDEX IF NOT EXISTS idx_teams_season ON teams(season_id);
CREATE INDEX IF NOT EXISTS idx_team_players_team ON team_players(team_id);
CREATE INDEX IF NOT EXISTS idx_team_players_player ON team_players(player_id);
CREATE INDEX idx_players_category ON players(category_id);
CREATE INDEX idx_players_tshirt ON players(category_id, tshirt_number);
CREATE INDEX idx_players_name ON players(first_name, last_name);
-- Player valuations table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_valuations_player ON player_valuations(player_id);
CREATE INDEX IF NOT EXISTS idx_valuations_evaluator ON player_valuations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_valuations_date ON player_valuations(evaluation_date);
CREATE INDEX IF NOT EXISTS idx_valuations_rating ON player_valuations(overall_rating);