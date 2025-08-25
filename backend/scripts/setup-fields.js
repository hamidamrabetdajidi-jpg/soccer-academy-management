const { getDatabase, initializeDatabase } = require('../config/database');

async function setupFieldsSystem() {
try {
        console.log('🔧 Fixing fields table...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Check if fields table exists
        const tableExists = await db.get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='fields'
        `);
        
        if (tableExists) {
            console.log('📊 Fields table exists, checking columns...');
            
            // Get current table structure
            const columns = await db.all('PRAGMA table_info(fields)');
            const columnNames = columns.map(col => col.name);
            
            console.log('📋 Current columns:', columnNames);
            
            // Drop and recreate table with correct structure
            console.log('🗑️ Dropping old table...');
            await db.exec('DROP TABLE IF EXISTS fields');
        }
        
        // Create the complete fields table
        console.log('🏗️ Creating new fields table...');
        await db.exec(`
            CREATE TABLE fields (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                field_type VARCHAR(50) DEFAULT 'full_size',
                surface_type VARCHAR(50) DEFAULT 'natural_grass',
                dimensions VARCHAR(100),
                capacity INTEGER DEFAULT 22,
                location VARCHAR(255),
                address TEXT,
                facilities TEXT,
                equipment_available TEXT,
                hourly_rate DECIMAL(10,2) DEFAULT 0.00,
                is_indoor BOOLEAN DEFAULT 0,
                has_lighting BOOLEAN DEFAULT 0,
                has_parking BOOLEAN DEFAULT 1,
                has_changing_rooms BOOLEAN DEFAULT 1,
                maintenance_notes TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Fields table created with all columns');
        
        // Insert sample data
        console.log('📊 Inserting sample fields...');
        
        const sampleFields = [
            [
                'Main Stadium Field',
                'Primary competition field with spectator facilities',
                'full_size',
                'natural_grass',
                '105m x 68m',
                22,
                'North Campus',
                '123 Academy Drive, Sports Complex',
                'Spectator stands, scoreboard, PA system',
                'Goals, corner flags, nets',
                0.00,
                0, 1, 1, 1, '', 1
            ],
            [
                'Training Field A',
                'Primary training field for daily sessions',
                'full_size',
                'artificial_turf',
                '100m x 64m',
                20,
                'East Campus',
                '123 Academy Drive, Training Complex',
                'Dugouts, equipment storage',
                'Training cones, goals, balls',
                0.00,
                0, 1, 1, 1, '', 1
            ],
            [
                'Indoor Sports Hall',
                'All-weather indoor training facility',
                'indoor_court',
                'indoor_surface',
                '40m x 20m',
                12,
                'Sports Complex',
                '123 Academy Drive, Indoor Complex',
                'Heating, sound system, storage',
                'Futsal goals, indoor balls, mats',
                0.00,
                1, 1, 1, 1, '', 1
            ],
            [
                'Youth Development Field',
                'Smaller field designed for youth players',
                'half_size',
                'natural_grass',
                '60m x 40m',
                14,
                'Youth Campus',
                '123 Academy Drive, Youth Complex',
                'Youth benches, mini changing rooms',
                'Youth goals, small equipment',
                0.00,
                0, 0, 1, 1, '', 1
            ]
        ];
        
        for (const field of sampleFields) {
            await db.run(`
                INSERT INTO fields (
                    name, description, field_type, surface_type, dimensions, capacity,
                    location, address, facilities, equipment_available, hourly_rate,
                    is_indoor, has_lighting, has_parking, has_changing_rooms, 
                    maintenance_notes, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, field);
        }
        
        console.log('✅ Sample fields inserted');
        
        // Verify the fix
        const finalFields = await db.all('SELECT id, name, field_type, is_indoor, has_lighting FROM fields');
        console.log('\n🎉 Fields table fixed! Available fields:');
        finalFields.forEach(f => {
            console.log(`  - ${f.id}: ${f.name} (${f.field_type}, Indoor: ${f.is_indoor ? 'Yes' : 'No'})`);
        });
        
    } catch (error) {
        console.error('❌ Failed to fix fields table:', error);
    }
}

setupFieldsSystem();