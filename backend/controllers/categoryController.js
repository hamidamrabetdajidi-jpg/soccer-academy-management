const { getDatabase } = require('../config/database');

const getCategories = async (req, res) => {
    try {
        const db = getDatabase();
        
        const categories = await db.all(`
            SELECT 
                c.*,
                COUNT(p.id) as player_count
            FROM categories c
            LEFT JOIN players p ON c.id = p.category_id AND p.is_active = 1
            WHERE c.is_active = 1
            GROUP BY c.id
            ORDER BY c.age_min
        `);
        
        res.json({ categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getCategories
};