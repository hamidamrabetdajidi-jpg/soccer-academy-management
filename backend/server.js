require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initializeDatabase, getDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors({
    origin: [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
        'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const playerController = require('./controllers/playerController');
const teamRoutes = require('./routes/teams');
const seasonRoutes = require('./routes/seasons');
const valuationRoutes = require('./routes/valuations');
const categoryController = require('./controllers/categoryController');

// Add this debug line to check if the file exists
try {
    console.log('✅ Training sessions routes loaded successfully');
    
    // Use routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/teams', teamRoutes);
    app.use('/api/seasons', seasonRoutes);
    app.use('/api/valuations', valuationRoutes);
    console.log('✅ Training sessions route registered at /api/training-sessions');
    
} catch (error) {
    console.error('❌ Failed to load training sessions routes:', error.message);
}
// Check that these lines exist in server.js
const trainingSessionRoutes = require('./routes/trainingSessions');
app.use('/api/training-sessions', trainingSessionRoutes);
// Player routes
app.get('/api/players', playerController.getAllPlayers);
app.post('/api/players', playerController.createPlayer);
app.get('/api/players/:id', playerController.getPlayerById);
app.put('/api/players/:id', playerController.updatePlayer);
app.delete('/api/players/:id', playerController.deletePlayer);
app.post('/api/players/:id/photo', playerController.upload.single('photo'), playerController.uploadPlayerPhoto);
app.get('/api/debug', (req, res) => {
    res.json({ message: 'API is working', timestamp: new Date() });
});
// Add this stats route to server.js
app.get('/api/stats', async (req, res) => {
    try {
        const db = getDatabase();
        
        const [players, teams, users, sessions] = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM players WHERE is_active = 1').catch(() => ({ count: 0 })),
            db.get('SELECT COUNT(*) as count FROM teams WHERE is_active = 1').catch(() => ({ count: 0 })),
            db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1').catch(() => ({ count: 0 })),
            db.get('SELECT COUNT(*) as count FROM training_sessions WHERE is_active = 1').catch(() => ({ count: 0 }))
        ]);

        res.json({
            players: players.count,
            teams: teams.count,
            users: users.count,
            sessions: sessions.count
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Category routes
app.get('/api/categories', categoryController.getCategories);

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});
const fieldRoutes = require('./routes/fields');
const fieldBookingRoutes = require('./routes/fieldBookings');
const paymentRoutes = require('./routes/payments');
const paymentCategoryRoutes = require('./routes/paymentCategories');

// And these lines exist
app.use('/api/payments', paymentRoutes);
app.use('/api/payment-categories', paymentCategoryRoutes);
// Add this line with other route uses
app.use('/api/field-bookings', fieldBookingRoutes);
// Add this line with other route uses
app.use('/api/fields', fieldRoutes);
// Health check
app.get('/api/health', async (req, res) => {
    try {
        const db = getDatabase();
        await db.get('SELECT 1');
        
        res.json({
            status: 'OK',
            message: 'Soccer Academy API is running',
            database: 'Connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
// Add this line with other route imports
const attendanceRoutes = require('./routes/attendance');

// Add this line with other route uses
app.use('/api/attendance', attendanceRoutes);
app.use('*', (req, res) => {
    console.log('404 - Route not found:', req.originalUrl);
    res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
    try {
        await initializeDatabase();
        
        app.listen(PORT, () => {
            console.log('🚀 Soccer Academy Management System');
            console.log(`📡 Server running on http://localhost:${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
            console.log(`👥 User endpoints: http://localhost:${PORT}/api/users`);
            console.log(`⚽ Player endpoints: http://localhost:${PORT}/api/players`);
            console.log(`🏆 Team endpoints: http://localhost:${PORT}/api/teams`);
            console.log(`📊 Valuation endpoints: http://localhost:${PORT}/api/valuations`);
            console.log(`🏃‍♂️ Training Session endpoints: http://localhost:${PORT}/api/training-sessions`);
            console.log(`📋 Categories endpoints: http://localhost:${PORT}/api/categories`);
            console.log('✨ Ready to manage your soccer academy!');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();