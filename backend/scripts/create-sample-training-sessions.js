const { getDatabase, initializeDatabase } = require('../config/database');

async function createSampleTrainingSessions() {
    try {
        console.log('🏃 Creating sample training sessions...');
        
        await initializeDatabase();
        const db = getDatabase();
        
        // Check current count
        const count = await db.get('SELECT COUNT(*) as count FROM training_sessions WHERE is_active = 1');
        
        if (count.count >= 3) {
            console.log('✅ Training sessions already exist, skipping creation');
            return;
        }
        
        const today = new Date();
        const sampleSessions = [
            {
                title: 'Morning Training Session',
                description: 'Basic skills and fitness training for all players',
                session_date: today.toISOString().split('T')[0],
                start_time: `${today.toISOString().split('T')[0]}T09:00:00`,
                end_time: `${today.toISOString().split('T')[0]}T11:00:00`,
                session_type: 'training',
                objectives: 'Improve ball control, passing accuracy, and fitness',
                drills: 'Passing drills, cone work, scrimmage',
                equipment_needed: 'Cones, balls, bibs, goals',
                max_participants: 25,
                is_mandatory: 1,
                notes: 'Focus on individual skills and team coordination'
            },
            {
                title: 'Tactical Session',
                description: 'Formation practice and strategy development',
                session_date: new Date(today.getTime() + 24*60*60*1000).toISOString().split('T')[0],
                start_time: `${new Date(today.getTime() + 24*60*60*1000).toISOString().split('T')[0]}T14:00:00`,
                end_time: `${new Date(today.getTime() + 24*60*60*1000).toISOString().split('T')[0]}T16:00:00`,
                session_type: 'tactical',
                objectives: 'Practice 4-3-3 formation and set pieces',
                drills: 'Formation drills, corner kicks, free kicks',
                equipment_needed: 'Full field setup, goals, wall',
                max_participants: 22,
                is_mandatory: 1,
                notes: 'Work on pressing and counter-attack strategies'
            },
            {
                title: 'Fitness Training',
                description: 'Conditioning and endurance building session',
                session_date: new Date(today.getTime() + 2*24*60*60*1000).toISOString().split('T')[0],
                start_time: `${new Date(today.getTime() + 2*24*60*60*1000).toISOString().split('T')[0]}T08:00:00`,
                end_time: `${new Date(today.getTime() + 2*24*60*60*1000).toISOString().split('T')[0]}T09:30:00`,
                session_type: 'fitness',
                objectives: 'Build cardiovascular endurance and strength',
                drills: 'Sprint intervals, circuit training, agility work',
                equipment_needed: 'Agility ladders, cones, weights',
                max_participants: 30,
                is_mandatory: 0,
                notes: 'High intensity interval training focus'
            }
        ];
        
        for (const session of sampleSessions) {
            await db.run(`
                INSERT INTO training_sessions (
                    title, description, session_date, start_time, end_time,
                    session_type, objectives, drills, equipment_needed,
                    max_participants, is_mandatory, notes, created_by_user_id, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                session.title, session.description, session.session_date,
                session.start_time, session.end_time, session.session_type,
                session.objectives, session.drills, session.equipment_needed,
                session.max_participants, session.is_mandatory, session.notes,
                1, // admin user
                1  // is_active
            ]);
        }
        
        console.log('✅ Sample training sessions created successfully');
        
        // Show created sessions
        const sessions = await db.all(`
            SELECT id, title, session_date, session_type
            FROM training_sessions 
            WHERE is_active = 1
            ORDER BY session_date
        `);
        
        console.log('\n🏃 Created training sessions:');
        sessions.forEach(s => {
            console.log(`  - ${s.title} (${s.session_type}) - ${s.session_date}`);
        });
        
    } catch (error) {
        console.error('❌ Failed to create sample training sessions:', error);
    }
}

createSampleTrainingSessions();