const { getDatabase, initializeDatabase } = require('../config/database');

async function setupPaymentSystem() {
    try {
        console.log('💳 Setting up Payment System...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Create payment categories table
        console.log('📊 Creating payment_categories table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS payment_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                default_amount DECIMAL(10,2) DEFAULT 0.00,
                is_recurring BOOLEAN DEFAULT 0,
                recurring_period VARCHAR(20) DEFAULT 'monthly',
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create payments table
        console.log('💰 Creating payments table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                category_id INTEGER NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                due_date DATE NOT NULL,
                paid_date DATE,
                payment_method VARCHAR(50),
                transaction_id VARCHAR(255),
                status VARCHAR(20) DEFAULT 'pending',
                notes TEXT,
                late_fee DECIMAL(10,2) DEFAULT 0.00,
                discount_amount DECIMAL(10,2) DEFAULT 0.00,
                created_by_user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (player_id) REFERENCES players(id),
                FOREIGN KEY (category_id) REFERENCES payment_categories(id),
                FOREIGN KEY (created_by_user_id) REFERENCES users(id)
            )
        `);
        
        // Create payment plans table (for installments)
        console.log('📅 Creating payment_plans table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS payment_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                plan_name VARCHAR(255) NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                installments INTEGER NOT NULL,
                installment_amount DECIMAL(10,2) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'active',
                created_by_user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (player_id) REFERENCES players(id),
                FOREIGN KEY (created_by_user_id) REFERENCES users(id)
            )
        `);
        
        // Create payment reminders table
        console.log('🔔 Creating payment_reminders table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS payment_reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payment_id INTEGER NOT NULL,
                reminder_date DATE NOT NULL,
                reminder_type VARCHAR(50) NOT NULL,
                sent BOOLEAN DEFAULT 0,
                sent_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (payment_id) REFERENCES payments(id)
            )
        `);
        
        // Create payment history/audit table
        console.log('📋 Creating payment_history table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS payment_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payment_id INTEGER NOT NULL,
                action VARCHAR(50) NOT NULL,
                old_status VARCHAR(20),
                new_status VARCHAR(20),
                amount_change DECIMAL(10,2),
                notes TEXT,
                created_by_user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (payment_id) REFERENCES payments(id),
                FOREIGN KEY (created_by_user_id) REFERENCES users(id)
            )
        `);
        
        // Insert default payment categories
        const categoryCount = await db.get('SELECT COUNT(*) as count FROM payment_categories');
        if (categoryCount.count === 0) {
            console.log('📊 Creating default payment categories...');
            
            const defaultCategories = [
                ['Registration Fee', 'One-time registration fee for new players', 50.00, 0, 'none'],
                ['Monthly Training Fee', 'Monthly fee for regular training sessions', 75.00, 1, 'monthly'],
                ['Equipment Fee', 'Cost for training equipment and uniforms', 25.00, 0, 'none'],
                ['Tournament Entry', 'Fee for tournament participation', 30.00, 0, 'none'],
                ['Private Coaching', 'One-on-one coaching sessions', 40.00, 0, 'session'],
                ['Facility Usage', 'Additional facility usage fees', 15.00, 0, 'none'],
                ['Late Payment Fee', 'Penalty for late payments', 10.00, 0, 'none'],
                ['Annual Membership', 'Yearly membership fee', 200.00, 1, 'yearly']
            ];
            
            for (const category of defaultCategories) {
                await db.run(`
                    INSERT INTO payment_categories (name, description, default_amount, is_recurring, recurring_period)
                    VALUES (?, ?, ?, ?, ?)
                `, category);
            }
            
            console.log('✅ Default payment categories created');
        }
        
        // Create sample payments for testing
        const paymentCount = await db.get('SELECT COUNT(*) as count FROM payments');
        if (paymentCount.count === 0) {
            console.log('💰 Creating sample payments...');
            
            // Get some players and categories for sample data
            const players = await db.all('SELECT id FROM players LIMIT 5');
            const categories = await db.all('SELECT id, default_amount FROM payment_categories LIMIT 3');
            
            if (players.length > 0 && categories.length > 0) {
                const today = new Date();
                
                for (let i = 0; i < Math.min(players.length, 10); i++) {
                    const player = players[i % players.length];
                    const category = categories[i % categories.length];
                    
                    const dueDate = new Date(today);
                    dueDate.setDate(today.getDate() + (i * 5)); // Spread due dates
                    
                    const status = i % 3 === 0 ? 'paid' : (i % 3 === 1 ? 'pending' : 'overdue');
                    const paidDate = status === 'paid' ? dueDate.toISOString().split('T')[0] : null;
                    
                    await db.run(`
                        INSERT INTO payments (
                            player_id, category_id, amount, due_date, paid_date, 
                            status, payment_method, created_by_user_id
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        player.id,
                        category.id,
                        category.default_amount,
                        dueDate.toISOString().split('T')[0],
                        paidDate,
                        status,
                        status === 'paid' ? 'credit_card' : null,
                        1 // admin user
                    ]);
                }
                
                console.log('✅ Sample payments created');
            }
        }
        
        // Create indexes for better performance
        console.log('📊 Creating indexes...');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_payments_player ON payments(player_id)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_payments_category ON payments(category_id)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_payment_plans_player ON payment_plans(player_id)');
        
        console.log('✅ Payment System setup completed!');
        
        // Show summary
        const stats = await db.get(`
            SELECT 
                (SELECT COUNT(*) FROM payments) as total_payments,
                (SELECT COUNT(*) FROM payments WHERE status = 'paid') as paid_payments,
                (SELECT COUNT(*) FROM payments WHERE status = 'pending') as pending_payments,
                (SELECT COUNT(*) FROM payments WHERE status = 'overdue') as overdue_payments,
                (SELECT COUNT(*) FROM payment_categories WHERE is_active = 1) as active_categories,
                (SELECT SUM(amount) FROM payments WHERE status = 'paid') as total_revenue
        `);
        
        console.log('\n💳 Payment System Summary:');
        console.log(`  - Total Payments: ${stats.total_payments}`);
        console.log(`  - Paid: ${stats.paid_payments}`);
        console.log(`  - Pending: ${stats.pending_payments}`);
        console.log(`  - Overdue: ${stats.overdue_payments}`);
        console.log(`  - Active Categories: ${stats.active_categories}`);
        console.log(`  - Total Revenue: $${stats.total_revenue || 0}`);
        
    } catch (error) {
        console.error('❌ Failed to setup payment system:', error);
        console.error('Error details:', error.message);
    }
}

setupPaymentSystem();