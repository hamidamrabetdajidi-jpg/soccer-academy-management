// Create backend/scripts/debug-fields.js
const { getDatabase, initializeDatabase } = require('../config/database');

async function debugFields() {
    try {
        console.log('🔍 Debugging fields system...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Check if tables exist
        const tables = await db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name LIKE '%field%'
            ORDER BY name
        `);
        
        console.log('📊 Field-related tables:');
        tables.forEach(table => console.log('  -', table.name));
        
        // Check fields table structure
        if (tables.some(t => t.name === 'fields')) {
            const fieldsSchema = await db.all('PRAGMA table_info(fields)');
            console.log('\n🏟️ Fields table structure:');
            fieldsSchema.forEach(col => console.log(`  - ${col.name}: ${col.type}`));
            
            // Check if any fields exist
            const fieldCount = await db.get('SELECT COUNT(*) as count FROM fields');
            console.log(`\n📊 Fields in database: ${fieldCount.count}`);
            
            if (fieldCount.count > 0) {
                const sampleFields = await db.all('SELECT id, name, field_type FROM fields LIMIT 3');
                console.log('\n📝 Sample fields:');
                sampleFields.forEach(f => console.log(`  - ${f.id}: ${f.name} (${f.field_type})`));
            }
        } else {
            console.log('\n❌ Fields table does not exist!');
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

debugFields();