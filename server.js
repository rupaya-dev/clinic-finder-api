const express = require('express');
const mongoose = require('mongoose');
const app = express();

// ======================
// MongoDB Connection
// ======================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinicDB';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log(`📊 Database: ${mongoose.connection.name}`);
  console.log(`🌐 Host: ${mongoose.connection.host}`);
})
.catch(err => {
  console.log('❌ MongoDB Connection Error:', err.message);
  console.log('⚠️ Application will use hardcoded data');
});

// Connection events
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.log('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected');
});

// ======================
// Middleware
// ======================
app.use(express.json());

// ======================
// Database Status Check
// ======================
app.get('/api/db-status', async (req, res) => {
  try {
    const Clinic = require('./models/clinic');
    const count = await Clinic.countDocuments();
    
    const dbInfo = {
      connected: mongoose.connection.readyState === 1,
      state: mongoose.connection.readyState,
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      total_clinics: count,
      using_database: count > 0
    };
    
    res.json({
      success: true,
      message: dbInfo.connected 
        ? (count > 0 ? 'Database connected and has data' : 'Database connected but empty')
        : 'Database not connected, using hardcoded data',
      database: dbInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Error checking database status',
      error: error.message,
      using_hardcoded: true
    });
  }
});

// ======================
// Routes
// ======================
const clinicRoutes = require('./routes/clinics');
app.use('/api/clinics', clinicRoutes);

// ======================
// Default route
// ======================
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Clinic API is running!',
    version: '1.0.0',
    endpoints: {
      get_clinics: 'GET /api/clinics?city=cityname',
      check_db: 'GET /api/db-status',
      available_cities: ['delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'hyderabad']
    },
    database: {
      connected: mongoose.connection.readyState === 1,
      using_real_db: mongoose.connection.readyState === 1
    }
  });
});

// ======================
// Health Check
// ======================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ======================
// 404 Handler
// ======================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    available_routes: ['/', '/health', '/api/clinics', '/api/db-status']
  });
});

// ======================
// Error Handler
// ======================
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

// ======================
// Start Server
// ======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`🔍 DB Status: http://localhost:${PORT}/api/db-status`);
  console.log(`🏥 Clinic API: http://localhost:${PORT}/api/clinics?city=mumbai`);
  console.log(`❤️ Health: http://localhost:${PORT}/health`);
  console.log(`\n📊 MongoDB State: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Not Connected'}`);
});
