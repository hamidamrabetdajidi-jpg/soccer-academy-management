const { getDatabase, initializeDatabase } = require('../config/database');

async function checkTables() {
    try {
        await initializeDatabase();
        const db = getDatabase();
        
        console.log('✅ Database connected successfully');
        
        // Check if tables exist
        const tables = await db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);
        
        console.log('📋 Available tables:', tables.map(t => t.name));
        
        // Check teams table structure
        try {
            const teamColumns = await db.all('PRAGMA table_info(teams)');
            console.log('🏆 Teams table columns:', teamColumns.map(c => c.name));
        } catch (error) {
            console.log('❌ Teams table does not exist');
        }
        
        // Check team_players table
        try {
            const teamPlayersColumns = await db.all('PRAGMA table_info(team_players)');
            console.log('👥 Team players table columns:', teamPlayersColumns.map(c => c.name));
        } catch (error) {
            console.log('❌ Team players table does not exist');
        }
        
        // Check seasons table
        try {
            const seasons = await db.all('SELECT * FROM seasons');
            console.log('📅 Seasons in database:', seasons.length);
        } catch (error) {
            console.log('❌ Seasons table does not exist');
        }
        
        // Check categories
        try {
            const categories = await db.all('SELECT * FROM categories');
            console.log('📊 Categories in database:', categories.length);
        } catch (error) {
            console.log('❌ Categories table issue');
        }
        
        // Check players
        try {
            const players = await db.all('SELECT COUNT(*) as count FROM players');
            console.log('⚽ Players in database:', players[0].count);
        } catch (error) {
            console.log('❌ Players table issue');
        }
        
        // Check users
        try {
            const users = await db.all('SELECT COUNT(*) as count FROM users');
            console.log('👤 Users in database:', users[0].count);
        } catch (error) {
            console.log('❌ Users table issue');
        }
        
    } catch (error) {
        console.error('❌ Database check failed:', error);
    }
}

checkTables();