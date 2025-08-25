const { getDatabase } = require('../config/database');

const getAllPayments = async (req, res) => {
    try {
        const {
            player_id,
            category_id,
            status,
            payment_method,
            start_date,
            end_date,
            overdue_only,
            sort_by = 'due_date',
            sort_order = 'desc',
            page = 1,
            limit = 50
        } = req.query;
        
        console.log('💳 Getting payments with filters:', req.query);
        
        const db = getDatabase();
        
        let query = `
            SELECT 
                p.*,
                pl.first_name || ' ' || pl.last_name as player_name,
                pl.email as player_email,
                pc.name as category_name,
                u.first_name || ' ' || u.last_name as created_by_name,
                (p.amount + p.late_fee - p.discount_amount) as total_amount,
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
        
        // Apply filters
        if (player_id) {
            query += ' AND p.player_id = ?';
            params.push(parseInt(player_id));
        }
        
        if (category_id) {
            query += ' AND p.category_id = ?';
            params.push(parseInt(category_id));
        }
        
        if (status) {
            query += ' AND p.status = ?';
            params.push(status);
        }
        
        if (payment_method) {
            query += ' AND p.payment_method = ?';
            params.push(payment_method);
        }
        
        if (start_date) {
            query += ' AND p.due_date >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            query += ' AND p.due_date <= ?';
            params.push(end_date);
        }
        
        if (overdue_only === 'true') {
            query += ' AND p.status = "overdue" AND p.due_date < date("now")';
        }
        
        // Sorting
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
        
        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);
        
        const payments = await db.all(query, params);
        
        // Get total count
        let countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
        countQuery = countQuery.replace(/ORDER BY[\s\S]*/, '');
        countQuery = countQuery.replace(/LIMIT[\s\S]*/, '');
        
        const countParams = params.slice(0, -2);
        const totalResult = await db.get(countQuery, countParams);
        const total = totalResult?.total || 0;
        
        // Get payment statistics
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_payments,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_payments,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_payments,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_payments,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount + late_fee - discount_amount END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount + late_fee - discount_amount END), 0) as pending_revenue,
                COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount + late_fee - discount_amount END), 0) as overdue_revenue,
                COALESCE(AVG(amount), 0) as avg_payment_amount
            FROM payments
        `);
        
        // Get this month's collections
        const monthlyStats = await db.get(`
            SELECT 
                COALESCE(SUM(amount + late_fee - discount_amount), 0) as monthly_revenue,
                COUNT(*) as monthly_payments
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
        
        console.log(`💰 Found ${payments.length} payments (${total} total)`);
        
        res.json({
            payments,
            stats: enhancedStats,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('❌ Get payments error:', error);
        res.status(500).json({ error: 'Failed to get payments: ' + error.message });
    }
};

const getPlayerPayments = async (req, res) => {
    try {
        const { playerId } = req.params;
        const { status, limit = 10 } = req.query;
        
        console.log(`💳 Getting payments for player ${playerId}`);
        
        const db = getDatabase();
        
        let query = `
            SELECT 
                p.*,
                pc.name as category_name,
                (p.amount + p.late_fee - p.discount_amount) as total_amount
            FROM payments p
            LEFT JOIN payment_categories pc ON p.category_id = pc.id
            WHERE p.player_id = ?
        `;
        
        const params = [playerId];
        
        if (status) {
            query += ' AND p.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY p.due_date DESC';
        
        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
        }
        
        const payments = await db.all(query, params);
        
        // Get player payment summary
        const summary = await db.get(`
            SELECT 
                COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue') THEN amount + late_fee - discount_amount END), 0) as total_due,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount + late_fee - discount_amount END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount + late_fee - discount_amount END), 0) as total_overdue,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
                MAX(CASE WHEN status = 'paid' THEN paid_date END) as last_payment_date
            FROM payments 
            WHERE player_id = ?
        `, [playerId]);
        
        res.json({
            payments,
            summary
        });
        
    } catch (error) {
        console.error('❌ Get player payments error:', error);
        res.status(500).json({ error: 'Failed to get player payments: ' + error.message });
    }
};

const createPayment = async (req, res) => {
    try {
        const {
            player_id, category_id, amount, due_date, notes, discount_amount = 0
        } = req.body;
        
        console.log('💳 Creating payment:', req.body);
        
        // Validation
        if (!player_id || !category_id || !amount || !due_date) {
            return res.status(400).json({
                error: 'Required fields: player_id, category_id, amount, due_date'
            });
        }
        
        const db = getDatabase();
        
        // Verify player exists
        const player = await db.get('SELECT id FROM players WHERE id = ?', [player_id]);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        // Verify category exists
        const category = await db.get('SELECT id FROM payment_categories WHERE id = ? AND is_active = 1', [category_id]);
        if (!category) {
            return res.status(404).json({ error: 'Payment category not found' });
        }
        
        const result = await db.run(`
            INSERT INTO payments (
                player_id, category_id, amount, due_date, notes, discount_amount, created_by_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
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
};

const updatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            amount, due_date, payment_method, transaction_id, status, notes, late_fee, discount_amount
        } = req.body;
        
        console.log(`💳 Updating payment ${id}:`, req.body);
        
        const db = getDatabase();
        
        // Get current payment
        const currentPayment = await db.get('SELECT * FROM payments WHERE id = ?', [id]);
        if (!currentPayment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        // Build update query dynamically
        const updateFields = [];
        const updateParams = [];
        
        if (amount !== undefined) {
            updateFields.push('amount = ?');
            updateParams.push(parseFloat(amount));
        }
        
        if (due_date !== undefined) {
            updateFields.push('due_date = ?');
            updateParams.push(due_date);
        }
        
        if (payment_method !== undefined) {
            updateFields.push('payment_method = ?');
            updateParams.push(payment_method);
        }
        
        if (transaction_id !== undefined) {
            updateFields.push('transaction_id = ?');
            updateParams.push(transaction_id);
        }
        
        if (status !== undefined) {
            updateFields.push('status = ?');
            updateParams.push(status);
            
            // If marking as paid, set paid_date
            if (status === 'paid' && !currentPayment.paid_date) {
                updateFields.push('paid_date = date("now")');
            }
        }
        
        if (notes !== undefined) {
            updateFields.push('notes = ?');
            updateParams.push(notes);
        }
        
        if (late_fee !== undefined) {
            updateFields.push('late_fee = ?');
            updateParams.push(parseFloat(late_fee) || 0);
        }
        
        if (discount_amount !== undefined) {
            updateFields.push('discount_amount = ?');
            updateParams.push(parseFloat(discount_amount) || 0);
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
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        // Log the change in payment history
        await db.run(`
            INSERT INTO payment_history (payment_id, action, old_status, new_status, notes, created_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            id,
            'payment_updated',
            currentPayment.status,
            status || currentPayment.status,
            `Payment updated by ${req.user.username}`,
            req.user.id
        ]);
        
        console.log('✅ Payment updated successfully');
        res.json({ message: 'Payment updated successfully' });
        
    } catch (error) {
        console.error('❌ Update payment error:', error);
        res.status(500).json({ error: 'Failed to update payment: ' + error.message });
    }
};

const markPaymentPaid = async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_method, transaction_id, paid_amount, notes } = req.body;
        
        console.log(`💰 Marking payment ${id} as paid`);
        
        const db = getDatabase();
        
        const payment = await db.get('SELECT * FROM payments WHERE id = ?', [id]);
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        if (payment.status === 'paid') {
            return res.status(400).json({ error: 'Payment is already marked as paid' });
        }
        
        const actualAmount = paid_amount || (payment.amount + payment.late_fee - payment.discount_amount);
        
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
            notes || `Paid $${actualAmount} on ${new Date().toLocaleDateString()}`,
            id
        ]);
        
        // Log in payment history
        await db.run(`
            INSERT INTO payment_history (payment_id, action, old_status, new_status, notes, created_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            id,
            'payment_received',
            payment.status,
            'paid',
            `Payment of $${actualAmount} received via ${payment_method || 'cash'}`,
            req.user.id
        ]);
        
        console.log('✅ Payment marked as paid');
        res.json({ message: 'Payment marked as paid successfully' });
        
    } catch (error) {
        console.error('❌ Mark payment paid error:', error);
        res.status(500).json({ error: 'Failed to mark payment as paid: ' + error.message });
    }
};

const deletePayment = async (req, res) => {
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
};

module.exports = {
    getAllPayments,
    getPlayerPayments,
    createPayment,
    updatePayment,   
    markPaymentPaid,
   deletePayment}