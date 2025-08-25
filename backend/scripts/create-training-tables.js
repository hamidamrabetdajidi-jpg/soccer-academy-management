const { getDatabase, initializeDatabase } = require('../config/database');

async function createTrainingTable() {
     try {
        console.log('🔍 Checking training_sessions table structure...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Get table info
        const tableInfo = await db.all("PRAGMA table_info(training_sessions)");
        
        console.log('📊 Current training_sessions table columns:');
        tableInfo.forEach(col => {
            console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.pk ? '(PRIMARY KEY)' : ''}`);
        });
        
        // Check if table exists
        const tableExists = await db.get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='training_sessions'
        `);
        
        if (!tableExists) {
            console.log('❌ training_sessions table does not exist');
            return;
        }
        
        // Count existing records
        const count = await db.get('SELECT COUNT(*) as count FROM training_sessions');
        console.log(`📈 Current records in table: ${count.count}`);
        
        // Show sample data
        if (count.count > 0) {
            const sample = await db.all('SELECT * FROM training_sessions LIMIT 3');
            console.log('\n📋 Sample records:');
            sample.forEach(record => {
                console.log('  -', JSON.stringify(record, null, 2));
            });
        }
        
    } catch (error) {
        console.error('❌ Error checking training_sessions table:', error);
    }
}

createTrainingTable();