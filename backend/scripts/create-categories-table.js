const { getDatabase, initializeDatabase } = require('../config/database');

async function createCategoriesTable() {
    try {
        console.log('📋 Creating categories table...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Create categories table
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        console.log('✅ Categories table created');
        
        // Insert sample categories if empty
        const categoryCount = await db.get('SELECT COUNT(*) as count FROM categories');
        if (categoryCount.count === 0) {
            await db.run(`
                INSERT INTO categories (name, age_min, age_max, description, max_players, training_frequency)
                VALUES 
                ('U8', 6, 8, 'Under 8 years old', 16, 2),
                ('U10', 9, 10, 'Under 10 years old', 18, 2),
                ('U12', 11, 12, 'Under 12 years old', 20, 3),
                ('U14', 13, 14, 'Under 14 years old', 22, 3),
                ('U16', 15, 16, 'Under 16 years old', 25, 4),
                ('U18', 17, 18, 'Under 18 years old', 25, 4),
                ('Senior', 19, 35, 'Senior players', 30, 3)
            `);
            console.log('✅ Sample categories added');
        }
        
        console.log('🎉 Categories table ready!');
        
    } catch (error) {
        console.error('❌ Failed to create categories table:', error);
        process.exit(1);
    }
}

createCategoriesTable();