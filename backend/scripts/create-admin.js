const bcrypt = require('bcryptjs');
const { initializeDatabase } = require('../config/database');

async function createAdmin() {
    try {
        const db = await initializeDatabase();
        
        // Hash the password 'admin123'
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Delete existing admin user
        await db.run('DELETE FROM users WHERE username = ?', ['admin']);
        
        // Insert new admin user
        await db.run(`
            INSERT INTO users (username, email, password_hash, role, first_name, last_name) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, ['admin', 'admin@academy.com', hashedPassword, 'admin', 'System', 'Administrator']);
        
        console.log('✅ Admin user created successfully!');
        console.log('Username: admin');
        console.log('Password: admin123');
        
        await db.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        process.exit(1);
    }
}

createAdmin();