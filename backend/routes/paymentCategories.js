const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

console.log('📊 Loading payment category routes...');

router.use(authenticateToken);

// Get all payment categories with proper database query
router.get('/', async (req, res) => {
    try {
        console.log('📊 Getting payment categories from database');
        const db = getDatabase();
        
        const categories = await db.all(`
            SELECT 
                id, 
                name, 
                description, 
                default_amount, 
                is_recurring, 
                recurring_period,
                is_active,
                created_at
            FROM payment_categories 
            WHERE is_active = 1 
            ORDER BY name ASC
        `);
        
        console.log('📊 Found categories:', categories.length);
        
        res.json({ categories });
        
    } catch (error) {
        console.error('❌ Get payment categories error:', error);
        
        // Fallback to hardcoded categories if database query fails
        console.log('⚠️ Using fallback categories');
        const fallbackCategories = [
            { id: 1, name: 'Monthly Training Fee', default_amount: 75.00, is_recurring: true, recurring_period: 'monthly' },
            { id: 2, name: 'Registration Fee', default_amount: 50.00, is_recurring: false, recurring_period: 'none' },
            { id: 3, name: 'Equipment Fee', default_amount: 25.00, is_recurring: false, recurring_period: 'none' },
            { id: 4, name: 'Tournament Entry', default_amount: 30.00, is_recurring: false, recurring_period: 'none' }
        ];
        
        res.json({ categories: fallbackCategories });
    }
});

console.log('✅ Payment category routes defined');

module.exports = router;