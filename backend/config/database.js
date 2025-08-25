const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

let db = null;

async function initializeDatabase() {
    try {
        const dbPath = path.join(__dirname, '../database/academy.db');
        
        db = await sqlite.open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        console.log('✅ Database connected successfully');
        return db;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
    }
}

function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase first.');
    }
    return db;
}

module.exports = {
    initializeDatabase,
    getDatabase
};