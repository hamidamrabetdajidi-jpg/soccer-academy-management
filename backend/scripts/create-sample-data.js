const { getDatabase, initializeDatabase } = require('../config/database');
const bcrypt = require('bcrypt');

async function createSampleData() {
    try {
        console.log('🔧 Creating sample data...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Create sample coaches
        const hashedPassword = await bcrypt.hash('coach123', 10);
        
        // Check if coaches already exist
        const existingCoaches = await db.all('SELECT id FROM users WHERE role = "coach"');
        
        if (existingCoaches.length === 0) {
            console.log('👨‍🏫 Creating sample coaches...');
            
            await db.run(`
                INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['coach1', 'coach1@academy.com', hashedPassword, 'John', 'Smith', 'coach', 1]);
            
            await db.run(`
                INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['coach2', 'coach2@academy.com', hashedPassword, 'Maria', 'Garcia', 'coach', 1]);
            
            await db.run(`
                INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['coach3', 'coach3@academy.com', hashedPassword, 'David', 'Johnson', 'coach', 1]);
            
            console.log('✅ Sample coaches created');
        }
        
        // Create sample categories if they don't exist
        const existingCategories = await db.all('SELECT id FROM categories');
        
        if (existingCategories.length === 0) {
            console.log('📋 Creating sample categories...');
            
            await db.run(`
                INSERT INTO categories (name, age_min, age_max, description, max_players, training_frequency)
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['U10', 8, 10, 'Under 10 years old', 18, 2]);
            
            await db.run(`
                INSERT INTO categories (name, age_min, age_max, description, max_players, training_frequency)
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['U12', 11, 12, 'Under 12 years old', 20, 3]);
            
            await db.run(`
                INSERT INTO categories (name, age_min, age_max, description, max_players, training_frequency)
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['U14', 13, 14, 'Under 14 years old', 22, 3]);
            
            console.log('✅ Sample categories created');
        }
        
        // Create sample teams if they don't exist
        const existingTeams = await db.all('SELECT id FROM teams');
        
        if (existingTeams.length === 0) {
            console.log('🏆 Creating sample teams...');
            
            await db.run(`
                INSERT INTO teams (name, description, coach_id, category_id, is_active)
                VALUES (?, ?, ?, ?, ?)
            `, ['Lions U12', 'Competitive U12 team', 1, 2, 1]);
            
            await db.run(`
                INSERT INTO teams (name, description, coach_id, category_id, is_active)
                VALUES (?, ?, ?, ?, ?)
            `, ['Eagles U14', 'Training U14 team', 2, 3, 1]);
            
            console.log('✅ Sample teams created');
        }
        
        console.log('🎉 Sample data creation completed!');
        console.log('📝 Coach credentials:');
        console.log('   Username: coach1, Password: coach123');
        console.log('   Username: coach2, Password: coach123');
        console.log('   Username: coach3, Password: coach123');
        
    } catch (error) {
        console.error('❌ Failed to create sample data:', error);
    }
}

createSampleData();