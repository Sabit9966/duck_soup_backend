require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const { startReaper } = require('./services/staleLockReaper');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const automationRoutes = require('./routes/automation');
const activityRoutes = require('./routes/activity');
const aiRoutes = require('./routes/ai');
const clientRoutes = require('./routes/clients');
const messageRoutes = require('./routes/messages');
const actionRoutes = require('./routes/actions');
const profileDataRoutes = require('./routes/profileData');

// Initialize express
const app = express();

// Connect to database (will be awaited before starting server)
let dbConnected = false;

// CORS Configuration - Must be before other middleware
// Handle preflight OPTIONS requests FIRST - Chrome extensions need this
app.use((req, res, next) => {
    // Set CORS headers for all requests
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-EXTENSION-KEY, ngrok-skip-browser-warning, Accept, Origin, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Additional CORS middleware for extra compatibility
app.use(cors({
    origin: '*', // Allow all origins (Chrome extensions don't send origin)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-EXTENSION-KEY', 'ngrok-skip-browser-warning', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/profile-data', profileDataRoutes);

// Health check route
app.get('/health', (req, res) => {
    res.json({ success: true, message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Something went wrong!' });
});

// Start server - wait for database connection first
const PORT = process.env.PORT || 5000;

// Connect to database first, then start server
(async () => {
    try {
        // Connect to database
        await connectDB();
        dbConnected = true;
        console.log('✅ Database connection established');
        
        // Start server only after database is connected
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            
            // Check OpenAI API key configuration
            if (process.env.OPENAI_API_KEY) {
                console.log(`✅ OpenAI API key configured (${process.env.OPENAI_API_KEY.substring(0, 10)}...)`);
                console.log(`🤖 OpenAI Model: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'}`);
            } else {
                console.warn('⚠️ WARNING: OPENAI_API_KEY not set in .env file');
                console.warn('⚠️ AI reply generation will fail until OPENAI_API_KEY is configured');
            }
            
            // Start stale lock reaper job only after database is confirmed connected
            if (dbConnected) {
                startReaper();
            }
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
})();
