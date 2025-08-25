const { getDatabase } = require('../config/database');

const getSeasons = async (req, res) => {
    try {
        const db = getDatabase();
        const seasons = await db.all('SELECT * FROM seasons ORDER BY start_date DESC');
        
        res.json({ seasons: seasons || [] });
    } catch (error) {
        console.error('Get seasons error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getSeasons
};