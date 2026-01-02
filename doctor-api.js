// doctor-api.js - STANDALONE DOCTOR SEARCH API
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// PORT - Different from main API
const PORT = process.env.PORT || 5000;

// SAME MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://haldharsinghepic_db_user:123456789101112@cluster0.tektwpr.mongodb.net/rupaya";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Doctor Search API - MongoDB Connected'))
.catch(err => console.log('❌ MongoDB Connection Error:', err));

// Clinic Schema
const clinicSchema = new mongoose.Schema({
  name: String,
  city: String,
  address: String,
  contact: String,
  email: String,
  doctors: Array
});

const Clinic = mongoose.model('Clinic', clinicSchema);

// ============== ONLY DOCTOR SEARCH ENDPOINTS ==============

// 1. Home
app.get('/', (req, res) => {
  res.json({
    api: 'Doctor Search Microservice',
    version: '1.0',
    purpose: 'Search doctors by clinic ID and specialization',
    endpoints: {
      searchDoctors: 'POST /api/search',
      clinicInfo: 'GET /api/clinic/:id',
      health: 'GET /health'
    }
  });
});

// 2. MAIN ENDPOINT: Search doctors
app.post('/api/search', async (req, res) => {
  try {
    const { clinicId, specialization } = req.body;
    
    if (!clinicId || !specialization) {
      return res.status(400).json({
        success: false,
        error: 'Missing clinicId or specialization'
      });
    }
    
    const clinic = await Clinic.findById(clinicId);
    
    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: 'Clinic not found'
      });
    }
    
    const doctors = clinic.doctors.filter(doc =>
      doc.specialization.toLowerCase().includes(specialization.toLowerCase())
    );
    
    res.json({
      success: true,
      clinic: {
        id: clinic._id,
        name: clinic.name,
        city: clinic.city,
        address: clinic.address
      },
      search: {
        specialization,
        results: doctors.length
      },
      doctors: doctors.map(d => ({
        name: d.name,
        specialization: d.specialization,
        experience: `${d.experience} years`,
        fee: `₹${d.consultation_fee}`,
        available: d.availability.join(', ')
      }))
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 3. Get clinic info
app.get('/api/clinic/:id', async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.params.id);
    
    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: 'Clinic not found'
      });
    }
    
    res.json({
      success: true,
      clinic: {
        id: clinic._id,
        name: clinic.name,
        city: clinic.city,
        address: clinic.address,
        contact: clinic.contact,
        totalDoctors: clinic.doctors.length,
        specializations: [...new Set(clinic.doctors.map(d => d.specialization))]
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 4. Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Doctor Search API',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`⚡ Doctor Search API running on port ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
});
