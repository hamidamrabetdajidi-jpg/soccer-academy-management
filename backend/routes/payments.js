const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

console.log('💳 Loading payment routes...');

// All routes require authentication
router.use(authenticateToken);

// Debug middleware
router.use((req, res, next) => {
    console.log(`💰 Payments API: ${req.method} ${req.path}`, {
        user: req.user?.username,
        role: req.user?.role
    });
    next();
});

// Simple test route
router.get('/test', (req, res) => {
    console.log('🧪 Payment test route hit');
    res.json({ message: 'Payment routes are working!', user: req.user?.username });
});

// Get all payments (simplified)
router.get('/', async (req, res) => {
    try {
        const {
            search,
            status,
            category_id,
            payment_method,
            start_date,
            end_date,
            overdue_only,
            sort_by = 'due_date',
            sort_order = 'desc'
        } = req.query;
        
        console.log('💳 Getting payments with filters:', req.query);
        
        const db = getDatabase();
        
        // Build query with proper JOINs
        let query = `
            SELECT 
                p.*,
                pl.first_name || ' ' || pl.last_name as player_name,
                pl.email as player_email,
                pc.name as category_name,
                u.first_name || ' ' || u.last_name as created_by_name,
                (p.amount + COALESCE(p.late_fee, 0) - COALESCE(p.discount_amount, 0)) as total_amount,
                CASE 
                    WHEN p.status = 'overdue' AND p.due_date < date('now')
                    THEN julianday('now') - julianday(p.due_date)
                    ELSE 0
                END as days_overdue
            FROM payments p
            LEFT JOIN players pl ON p.player_id = pl.id
            LEFT JOIN payment_categories pc ON p.category_id = pc.id
            LEFT JOIN users u ON p.created_by_user_id = u.id
            WHERE 1=1
        `;
        
        const params = [];
        
        // Apply search filter
      if (search && search.trim() !== '') {
            const searchTerm = `%${search.trim().toLowerCase()}%`;
            query += ` AND (
                LOWER(pl.first_name) LIKE ? OR 
                LOWER(pl.last_name) LIKE ? OR 
                LOWER(pl.first_name || ' ' || pl.last_name) LIKE ? OR
                LOWER(pl.email) LIKE ? OR
                LOWER(pc.name) LIKE ? OR
                LOWER(p.notes) LIKE ?
            )`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
            console.log('🔍 Search filter applied with term:', search.trim());
        }
        
        // Apply status filter
        if (status && status !== '') {
            query += ' AND p.status = ?';
            params.push(status);
        }
        
        // Apply category filter
        if (category_id && category_id !== '') {
            query += ' AND p.category_id = ?';
            params.push(parseInt(category_id));
        }
        
        // Apply payment method filter
        if (payment_method && payment_method !== '') {
            query += ' AND p.payment_method = ?';
            params.push(payment_method);
        }
        
        // Apply date range filters
        if (start_date && start_date !== '') {
            query += ' AND p.due_date >= ?';
            params.push(start_date);
        }
        
        if (end_date && end_date !== '') {
            query += ' AND p.due_date <= ?';
            params.push(end_date);
        }
        
        // Apply overdue filter
        if (overdue_only === 'true') {
            query += ' AND p.status = "overdue" AND p.due_date < date("now")';
        }
        
        // Add sorting
        const allowedSortFields = ['due_date', 'amount', 'player_name', 'category_name', 'status', 'created_at'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'due_date';
        const sortDirection = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        
        if (sortField === 'player_name') {
            query += ` ORDER BY pl.first_name ${sortDirection}, pl.last_name ${sortDirection}`;
        } else if (sortField === 'category_name') {
            query += ` ORDER BY pc.name ${sortDirection}`;
        } else {
            query += ` ORDER BY p.${sortField} ${sortDirection}`;
        }
        
        // Add limit to prevent too many results
        query += ' LIMIT 100';
        
        console.log('📊 Executing query with', params.length, 'parameters');
        
        const payments = await db.all(query, params);
        
        // Get payment statistics
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_payments,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_payments,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_payments,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_payments,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0) END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0) END), 0) as pending_revenue,
                COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0) END), 0) as overdue_revenue,
                COALESCE(AVG(amount), 0) as avg_payment_amount
            FROM payments
        `);
        
        // Get this month's collections
        const monthlyStats = await db.get(`
            SELECT 
                COALESCE(SUM(amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0)), 0) as monthly_revenue
            FROM payments 
            WHERE status = 'paid' 
            AND strftime('%Y-%m', paid_date) = strftime('%Y-%m', 'now')
        `);
        
        const enhancedStats = {
            ...stats,
            monthly_revenue: monthlyStats.monthly_revenue,
            this_month_collections: monthlyStats.monthly_revenue,
            payment_success_rate: stats.total_payments > 0 ? 
                ((stats.paid_payments / stats.total_payments) * 100).toFixed(1) : 0
        };
        
        console.log(`💰 Found ${payments.length} payments`);
        
        res.json({
            payments,
            stats: enhancedStats
        });
        
    } catch (error) {
        console.error('❌ Get payments error:', error);
        res.status(500).json({ error: 'Failed to get payments: ' + error.message });
    }
});

// Create payment
router.post('/', async (req, res) => {
    try {
        const { player_id, category_id, amount, due_date, notes, discount_amount = 0 } = req.body;
        
        console.log('💳 Creating payment:', req.body);
        
        if (!player_id || !category_id || !amount || !due_date) {
            return res.status(400).json({
                error: 'Required fields: player_id, category_id, amount, due_date'
            });
        }
        
        const db = getDatabase();
        
        const result = await db.run(`
            INSERT INTO payments (
                player_id, category_id, amount, due_date, notes, discount_amount, created_by_user_id, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `, [
            player_id,
            category_id,
            parseFloat(amount),
            due_date,
            notes || '',
            parseFloat(discount_amount) || 0,
            req.user.id
        ]);
        
        console.log('✅ Payment created with ID:', result.lastID);
        
        res.status(201).json({
            message: 'Payment created successfully',
            id: result.lastID
        });
        
    } catch (error) {
        console.error('❌ Create payment error:', error);
        res.status(500).json({ error: 'Failed to create payment: ' + error.message });
    }
});

// Mark payment as paid
router.post('/:id/mark-paid', async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_method, transaction_id, notes } = req.body;
        
        console.log(`💰 Marking payment ${id} as paid`);
        
        const db = getDatabase();
        
        await db.run(`
            UPDATE payments SET 
                status = 'paid',
                paid_date = date('now'),
                payment_method = ?,
                transaction_id = ?,
                notes = COALESCE(notes || ' | ', '') || ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            payment_method || 'cash',
            transaction_id || '',
            notes || 'Payment received',
            id
        ]);
        
        console.log('✅ Payment marked as paid');
        res.json({ message: 'Payment marked as paid successfully' });
        
    } catch (error) {
        console.error('❌ Mark payment paid error:', error);
        res.status(500).json({ error: 'Failed to mark payment as paid: ' + error.message });
    }
});
// Add this route after the create payment route in payments.js

// Update payment
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            player_id, category_id, amount, due_date, notes, discount_amount, late_fee
        } = req.body;
        
        console.log(`💳 Updating payment ${id}:`, req.body);
        
        const db = getDatabase();
        
        // Check if payment exists
        const existingPayment = await db.get('SELECT * FROM payments WHERE id = ?', [id]);
        if (!existingPayment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        // Build update query dynamically
        const updateFields = [];
        const updateParams = [];
        
        if (player_id !== undefined) {
            updateFields.push('player_id = ?');
            updateParams.push(parseInt(player_id));
        }
        
        if (category_id !== undefined) {
            updateFields.push('category_id = ?');
            updateParams.push(parseInt(category_id));
        }
        
        if (amount !== undefined) {
            updateFields.push('amount = ?');
            updateParams.push(parseFloat(amount));
        }
        
        if (due_date !== undefined) {
            updateFields.push('due_date = ?');
            updateParams.push(due_date);
        }
        
        if (notes !== undefined) {
            updateFields.push('notes = ?');
            updateParams.push(notes || '');
        }
        
        if (discount_amount !== undefined) {
            updateFields.push('discount_amount = ?');
            updateParams.push(parseFloat(discount_amount) || 0);
        }
        
        if (late_fee !== undefined) {
            updateFields.push('late_fee = ?');
            updateParams.push(parseFloat(late_fee) || 0);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateParams.push(id);
        
        const result = await db.run(`
            UPDATE payments SET ${updateFields.join(', ')} WHERE id = ?
        `, updateParams);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Payment not found or no changes made' });
        }
        
        console.log('✅ Payment updated successfully, changes:', result.changes);
        res.json({ 
            message: 'Payment updated successfully',
            updated_id: id,
            changes: result.changes
        });
        
    } catch (error) {
        console.error('❌ Update payment error:', error);
        res.status(500).json({ error: 'Failed to update payment: ' + error.message });
    }
});

// Delete payment
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`🗑️ Deleting payment ${id}`);
        
        const db = getDatabase();
        
        const payment = await db.get('SELECT * FROM payments WHERE id = ?', [id]);
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        if (payment.status === 'paid') {
            return res.status(400).json({ error: 'Cannot delete a paid payment' });
        }
        
        await db.run('DELETE FROM payments WHERE id = ?', [id]);
        
        console.log('✅ Payment deleted successfully');
        res.json({ message: 'Payment deleted successfully' });
        
    } catch (error) {
        console.error('❌ Delete payment error:', error);
        res.status(500).json({ error: 'Failed to delete payment: ' + error.message });
    }
});
// Add these new routes to the existing payments.js file

// Revenue analytics endpoint
router.get('/revenue', async (req, res) => {
    try {
        console.log('📊 Getting revenue analytics');
        const db = getDatabase();
        
        // Get monthly revenue data for the last 12 months
        const monthlyRevenue = await db.all(`
            SELECT 
                strftime('%Y-%m', paid_date) as month,
                SUM(amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0)) as revenue,
                COUNT(*) as payment_count
            FROM payments 
            WHERE status = 'paid' 
            AND paid_date >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', paid_date)
            ORDER BY month ASC
        `);
        
        // Get payment methods breakdown
        const paymentMethods = await db.all(`
            SELECT 
                COALESCE(payment_method, 'Not Specified') as method,
                SUM(amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0)) as amount,
                COUNT(*) as count
            FROM payments 
            WHERE status = 'paid'
            GROUP BY payment_method
            ORDER BY amount DESC
        `);
        
        // Get category breakdown
        const categoryBreakdown = await db.all(`
            SELECT 
                pc.name as category,
                SUM(p.amount + COALESCE(p.late_fee, 0) - COALESCE(p.discount_amount, 0)) as amount,
                COUNT(*) as count
            FROM payments p
            LEFT JOIN payment_categories pc ON p.category_id = pc.id
            WHERE p.status = 'paid'
            GROUP BY pc.name
            ORDER BY amount DESC
        `);
        
        // Get overdue analysis
        const overdueAnalysis = await db.all(`
            SELECT 
                CASE 
                    WHEN julianday('now') - julianday(due_date) <= 7 THEN '1-7 days'
                    WHEN julianday('now') - julianday(due_date) <= 30 THEN '8-30 days'
                    WHEN julianday('now') - julianday(due_date) <= 90 THEN '31-90 days'
                    ELSE '90+ days'
                END as days_range,
                SUM(amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0)) as amount,
                COUNT(*) as count
            FROM payments 
            WHERE status = 'overdue'
            GROUP BY days_range
            ORDER BY 
                CASE days_range
                    WHEN '1-7 days' THEN 1
                    WHEN '8-30 days' THEN 2
                    WHEN '31-90 days' THEN 3
                    ELSE 4
                END
        `);
        
        // Get top paying players
        const topPlayers = await db.all(`
            SELECT 
                pl.first_name || ' ' || pl.last_name as player_name,
                SUM(p.amount + COALESCE(p.late_fee, 0) - COALESCE(p.discount_amount, 0)) as total_paid,
                COUNT(*) as payment_count
            FROM payments p
            LEFT JOIN players pl ON p.player_id = pl.id
            WHERE p.status = 'paid'
            GROUP BY p.player_id
            ORDER BY total_paid DESC
            LIMIT 10
        `);
        
        // Calculate yearly revenue and growth
        const currentYear = new Date().getFullYear();
        const yearlyRevenue = await db.get(`
            SELECT 
                COALESCE(SUM(amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0)), 0) as yearly_total
            FROM payments 
            WHERE status = 'paid' 
            AND strftime('%Y', paid_date) = ?
        `, [currentYear.toString()]);
        
        const lastYearRevenue = await db.get(`
            SELECT 
                COALESCE(SUM(amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0)), 0) as last_year_total
            FROM payments 
            WHERE status = 'paid' 
            AND strftime('%Y', paid_date) = ?
        `, [(currentYear - 1).toString()]);
        
        // Calculate growth rate
        const growthRate = lastYearRevenue.last_year_total > 0 
            ? ((yearlyRevenue.yearly_total - lastYearRevenue.last_year_total) / lastYearRevenue.last_year_total) * 100
            : 0;
        
        // Format monthly data
        const monthlyLabels = monthlyRevenue.map(m => {
            const date = new Date(m.month + '-01');
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });
        
        const monthlyAmounts = monthlyRevenue.map(m => parseFloat(m.revenue || 0));
        
        const revenueData = {
            monthly_revenue: monthlyAmounts,
            monthly_labels: monthlyLabels,
            yearly_revenue: parseFloat(yearlyRevenue.yearly_total || 0),
            growth_rate: parseFloat(growthRate.toFixed(2)),
            payment_methods: paymentMethods.map(pm => ({
                method: pm.method,
                amount: parseFloat(pm.amount || 0),
                count: pm.count
            })),
            category_breakdown: categoryBreakdown.map(cb => ({
                category: cb.category || 'Unknown',
                amount: parseFloat(cb.amount || 0),
                count: cb.count
            })),
            overdue_analysis: overdueAnalysis.map(oa => ({
                days_range: oa.days_range,
                amount: parseFloat(oa.amount || 0),
                count: oa.count
            })),
            top_players: topPlayers.map(tp => ({
                player_name: tp.player_name || 'Unknown',
                total_paid: parseFloat(tp.total_paid || 0),
                payment_count: tp.payment_count
            }))
        };
        
        console.log('📊 Revenue data compiled successfully');
        res.json(revenueData);
        
    } catch (error) {
        console.error('❌ Revenue analytics error:', error);
        res.status(500).json({ error: 'Failed to get revenue analytics: ' + error.message });
    }
});

// Dashboard metrics endpoint
router.get('/metrics', async (req, res) => {
    try {
        console.log('📊 Getting dashboard metrics');
        const db = getDatabase();
        
        const metrics = await db.get(`
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0) END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0) END), 0) as pending_amount,
                COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0) END), 0) as overdue_amount,
                COALESCE(AVG(CASE WHEN status = 'paid' THEN amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0) END), 0) as average_payment,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
                COUNT(*) as total_count
            FROM payments
        `);
        
        const thisMonthRevenue = await db.get(`
            SELECT 
                COALESCE(SUM(amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0)), 0) as this_month_collections
            FROM payments 
            WHERE status = 'paid' 
            AND strftime('%Y-%m', paid_date) = strftime('%Y-%m', 'now')
        `);
        
        const lastMonthRevenue = await db.get(`
            SELECT 
                COALESCE(SUM(amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0)), 0) as last_month_collections
            FROM payments 
            WHERE status = 'paid' 
            AND strftime('%Y-%m', paid_date) = strftime('%Y-%m', date('now', '-1 month'))
        `);
        
        // Calculate monthly growth
        const monthlyGrowth = lastMonthRevenue.last_month_collections > 0
            ? ((thisMonthRevenue.this_month_collections - lastMonthRevenue.last_month_collections) / lastMonthRevenue.last_month_collections) * 100
            : 0;
        
        // Calculate payment success rate
        const paymentSuccessRate = metrics.total_count > 0 
            ? (metrics.paid_count / metrics.total_count) * 100 
            : 0;
        
        // Project monthly based on average
        const projectedMonthly = metrics.average_payment * 
            (await db.get('SELECT COUNT(DISTINCT player_id) as active_players FROM payments WHERE created_at >= date("now", "-3 months")')).active_players;
        
        const dashboardMetrics = {
            total_revenue: parseFloat(metrics.total_revenue || 0),
            monthly_growth: parseFloat(monthlyGrowth.toFixed(2)),
            payment_success_rate: parseFloat(paymentSuccessRate.toFixed(1)),
            average_payment: parseFloat(metrics.average_payment || 0),
            pending_amount: parseFloat(metrics.pending_amount || 0),
            overdue_amount: parseFloat(metrics.overdue_amount || 0),
            this_month_collections: parseFloat(thisMonthRevenue.this_month_collections || 0),
            projected_monthly: parseFloat(projectedMonthly || 0)
        };
        
        console.log('📊 Dashboard metrics compiled successfully');
        res.json(dashboardMetrics);
        
    } catch (error) {
        console.error('❌ Dashboard metrics error:', error);
        res.status(500).json({ error: 'Failed to get dashboard metrics: ' + error.message });
    }
});
console.log('✅ Payment routes defined');

module.exports = router;