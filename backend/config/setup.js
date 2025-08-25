const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('./database');

async function setupDatabase() {
    try {
        // Create database directory
        const dbDir = path.join(__dirname, '../database');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Initialize database connection
        const db = await initializeDatabase();

        // Read and execute schema
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split statements and execute them
        const statements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log('🗄️ Setting up database...');
        
        for (const statement of statements) {
            try {
                await db.exec(statement);
            } catch (error) {
                if (!error.message.includes('already exists')) {
                    console.error('Error executing statement:', error.message);
                }
            }
        }

        console.log('✅ Database setup completed successfully!');
        console.log('📊 Tables created:');
        
        const tables = await db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `);
        
        tables.forEach(table => {
            console.log(`   - ${table.name}`);
        });

        await db.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

setupDatabase();