const { getDatabase, initializeDatabase } = require('../config/database');

async function setupFieldBookings() {
    try {
        console.log('📅 Setting up Field Booking system...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Create field bookings table
        console.log('📊 Creating field_bookings table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS field_bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                field_id INTEGER NOT NULL,
                session_id INTEGER,
                booking_type VARCHAR(50) DEFAULT 'training',
                booking_title VARCHAR(255) NOT NULL,
                booking_date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                booked_by_user_id INTEGER NOT NULL,
                notes TEXT,
                status VARCHAR(20) DEFAULT 'confirmed',
                recurring_type VARCHAR(20),
                recurring_end_date TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (field_id) REFERENCES fields(id),
                FOREIGN KEY (session_id) REFERENCES training_sessions(id),
                FOREIGN KEY (booked_by_user_id) REFERENCES users(id)
            )
        `);
        
        // Create booking conflicts table
        console.log('⚠️ Creating booking_conflicts table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS booking_conflicts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER NOT NULL,
                conflicting_booking_id INTEGER NOT NULL,
                conflict_type VARCHAR(50) NOT NULL,
                resolved BOOLEAN DEFAULT 0,
                resolved_by_user_id INTEGER,
                resolved_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (booking_id) REFERENCES field_bookings(id),
                FOREIGN KEY (conflicting_booking_id) REFERENCES field_bookings(id),
                FOREIGN KEY (resolved_by_user_id) REFERENCES users(id)
            )
        `);
        
        // Create field availability rules table
        console.log('📋 Creating field_availability_rules table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS field_availability_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                field_id INTEGER NOT NULL,
                day_of_week INTEGER NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                is_available BOOLEAN DEFAULT 1,
                reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (field_id) REFERENCES fields(id)
            )
        `);
        
        // Insert sample bookings
        const bookingCount = await db.get('SELECT COUNT(*) as count FROM field_bookings');
        if (bookingCount.count === 0) {
            console.log('📅 Creating sample bookings...');
            
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const dayAfter = new Date(today);
            dayAfter.setDate(today.getDate() + 2);
            
            const sampleBookings = [
                [
                    1, // field_id
                    null, // session_id
                    'training',
                    'Morning Youth Training',
                    today.toISOString().split('T')[0],
                    '09:00',
                    '10:30',
                    1, // booked_by_user_id (admin)
                    'Youth development session',
                    'confirmed'
                ],
                [
                    1,
                    null,
                    'match',
                    'Weekend League Match',
                    tomorrow.toISOString().split('T')[0],
                    '15:00',
                    '17:00',
                    1,
                    'League championship match',
                    'confirmed'
                ],
                [
                    2,
                    null,
                    'training',
                    'Evening Skills Training',
                    dayAfter.toISOString().split('T')[0],
                    '18:00',
                    '19:30',
                    1,
                    'Technical skills focus',
                    'confirmed'
                ]
            ];
            
            for (const booking of sampleBookings) {
                await db.run(`
                    INSERT INTO field_bookings (
                        field_id, session_id, booking_type, booking_title, booking_date,
                        start_time, end_time, booked_by_user_id, notes, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, booking);
            }
            
            console.log('✅ Sample bookings created');
        }
        
        // Create indexes
        console.log('📊 Creating indexes...');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_bookings_field_date ON field_bookings(field_id, booking_date)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON field_bookings(booking_date, start_time, end_time)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_bookings_status ON field_bookings(status)');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_bookings_type ON field_bookings(booking_type)');
        
        console.log('✅ Field Booking system setup completed!');
        
        // Show what we created
        const bookings = await db.all(`
            SELECT 
                fb.id, fb.booking_title, fb.booking_date, fb.start_time, fb.end_time,
                f.name as field_name
            FROM field_bookings fb
            JOIN fields f ON fb.field_id = f.id
            ORDER BY fb.booking_date, fb.start_time
        `);
        
        console.log('\n📅 Available bookings:');
        bookings.forEach(b => {
            console.log(`  - ${b.id}: ${b.booking_title} at ${b.field_name} (${b.booking_date} ${b.start_time}-${b.end_time})`);
        });
        
    } catch (error) {
        console.error('❌ Failed to setup field booking system:', error);
        console.error('Error details:', error.message);
    }
}

setupFieldBookings();