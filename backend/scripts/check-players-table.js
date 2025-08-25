const { getDatabase, initializeDatabase } = require('../config/database');

async function checkPlayersTable() {
    try {
        console.log('🔍 Checking players table structure...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Check if table exists
        const tableExists = await db.get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='players'
        `);
        
        if (!tableExists) {
            console.log('❌ players table does not exist');
            return;
        }
        
        // Get table info
        const tableInfo = await db.all("PRAGMA table_info(players)");
        console.log('📊 Current players table columns:');
        tableInfo.forEach(col => {
            console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.pk ? '(PRIMARY KEY)' : ''}`);
        });
        
        const existingColumns = tableInfo.map(col => col.name);
        
        // Check if position column exists
        if (!existingColumns.includes('position')) {
            console.log('❌ position column missing, adding it...');
            
            try {
                await db.exec('ALTER TABLE players ADD COLUMN position VARCHAR(50)');
                console.log('✅ position column added');
            } catch (error) {
                console.log('⚠️ Could not add position column:', error.message);
            }
        } else {
            console.log('✅ position column exists');
        }
        
        // Check if jersey_number column exists
        if (!existingColumns.includes('jersey_number')) {
            console.log('❌ jersey_number column missing, adding it...');
            
            try {
                await db.exec('ALTER TABLE players ADD COLUMN jersey_number INTEGER');
                console.log('✅ jersey_number column added');
            } catch (error) {
                console.log('⚠️ Could not add jersey_number column:', error.message);
            }
        } else {
            console.log('✅ jersey_number column exists');
        }
        
        // Update existing players with default positions if they don't have one
        const playersWithoutPosition = await db.all(`
            SELECT id, first_name, last_name 
            FROM players 
            WHERE position IS NULL OR position = ''
        `);
        
        if (playersWithoutPosition.length > 0) {
            console.log(`📋 Updating ${playersWithoutPosition.length} players with default positions...`);
            
            const defaultPositions = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];
            
            for (let i = 0; i < playersWithoutPosition.length; i++) {
                const player = playersWithoutPosition[i];
                const position = defaultPositions[i % defaultPositions.length];
                
                await db.run(`
                    UPDATE players 
                    SET position = ? 
                    WHERE id = ?
                `, [position, player.id]);
                
                console.log(`  - Updated ${player.first_name} ${player.last_name} to ${position}`);
            }
        }
        
        // Show final table structure
        const finalTableInfo = await db.all("PRAGMA table_info(players)");
        console.log('\n📊 Final players table structure:');
        finalTableInfo.forEach(col => {
            console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.pk ? '(PRIMARY KEY)' : ''}`);
        });
        
        // Show sample data
        const samplePlayers = await db.all(`
            SELECT id, first_name, last_name, position, jersey_number, is_active
            FROM players 
            ORDER BY first_name 
            LIMIT 5
        `);
        
        console.log('\n👥 Sample players:');
        samplePlayers.forEach(player => {
            console.log(`  - ${player.first_name} ${player.last_name} (${player.position || 'No position'}) #${player.jersey_number || 'No number'} - Active: ${player.is_active}`);
        });
        
        console.log('✅ Players table check completed');
        
    } catch (error) {
        console.error('❌ Error checking players table:', error);
    }
}

checkPlayersTable();