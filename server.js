const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://haldharsinghepic_db_user:123456789101112@cluster0.tektwpr.mongodb.net/rupaya";

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
const clinicRoutes = require('./routes/clinics');
app.use('/api/clinics', clinicRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Clinic & Doctor Finder API',
    version: '2.0.0',
    description: 'Find clinics and doctors with intelligent selection logic',
    features: {
      clinicSearch: 'Find clinics by city with distance calculation',
      doctorSelection: 'Select doctors with automatic/manual clinic selection',
      smartLogic: 'Auto-select individual clinics, manual for multi-branch'
    },
    endpoints: {
      // Clinic endpoints
      nearbyClinics: 'GET /api/clinics/nearby/city?city=delhi',
      allClinics: 'GET /api/clinics',
      
      // Doctor endpoints (NEW)
      allDoctors: 'GET /api/clinics/doctors',
      doctorsByCity: 'GET /api/clinics/doctors?city=delhi&specialization=cardiologist',
      selectDoctor: 'POST /api/clinics/select-doctor',
      seedDoctors: 'POST /api/clinics/seed-doctors',
      
      // Utility endpoints
      test: 'GET /api/clinics/test',
      health: 'GET /health'
    },
    selectionLogic: {
      individualClinic: 'Auto-selected (if doctor has only one individual clinic)',
      multiBranchClinic: 'Manual branch selection required',
      bothTypes: 'All options shown for user choice'
    },
    supportedCities: ['delhi', 'mumbai', 'bangalore', 'chennai', 'noida', 'gurgaon', 'hyderabad', 'pune', 'kolkata', 'jaipur']
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'clinic-doctor-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    availableRoutes: {
      home: 'GET /',
      health: 'GET /health',
      nearbyClinics: 'GET /api/clinics/nearby/city?city=delhi',
      doctors: 'GET /api/clinics/doctors',
      selectDoctor: 'POST /api/clinics/select-doctor'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Clinic & Doctor Finder API running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🌍 Health: http://localhost:${PORT}/health`);
  console.log(`🏥 Clinic Search: http://localhost:${PORT}/api/clinics/nearby/city?city=delhi`);
  console.log(`👨‍⚕️ Doctor Search: http://localhost:${PORT}/api/clinics/doctors`);
});
