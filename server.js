const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const clinicRoutes = require('./routes/clinics');
app.use('/api/clinics', clinicRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Clinic Finder API is running!',
    version: '1.0.0',
    endpoints: {
      nearby_clinics: 'GET /api/clinics/nearby/city?city=delhi',
      health_check: 'GET /health',
      test: 'GET /api/clinics/test'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'clinic-api',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});