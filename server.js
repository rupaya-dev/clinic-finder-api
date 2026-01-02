const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// MongoDB Connection - IMPORTANT: Use MONGODB_URI from .env
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://haldharsinghepic_db_user:123456789101112@cluster0.tektwpr.mongodb.net/rupaya";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.log('❌ MongoDB Connection Error:', err));

// Clinic Schema
const clinicSchema = new mongoose.Schema({
  name: String,
  city: String,
  address: String,
  contact: String,
  email: String,
  doctors: [{
    name: String,
    specialization: String,
    experience: Number,
    qualification: String,
    consultation_fee: Number,
    availability: [String]
  }]
});

const Clinic = mongoose.model('Clinic', clinicSchema);

// 1. Get all clinics (filter by city if provided)
app.get('/api/clinics', async (req, res) => {
  try {
    const { city } = req.query;
    
    let query = {};
    if (city) {
      query.city = { $regex: new RegExp(city, 'i') };
    }
    
    const clinics = await Clinic.find(query);
    
    res.json({
      success: true,
      total: clinics.length,
      clinics: clinics.map(clinic => ({
        id: clinic._id,
        name: clinic.name,
        city: clinic.city,
        address: clinic.address,
        contact: clinic.contact,
        email: clinic.email,
        totalDoctors: clinic.doctors.length,
        doctors: clinic.doctors
      }))
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 2. Get clinic by ID
app.get('/api/clinics/:clinicId', async (req, res) => {
  try {
    const clinicId = req.params.clinicId;
    
    if (!mongoose.Types.ObjectId.isValid(clinicId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid clinic ID format' 
      });
    }
    
    const clinic = await Clinic.findById(clinicId);
    
    if (!clinic) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clinic not found' 
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
        email: clinic.email,
        totalDoctors: clinic.doctors.length,
        doctors: clinic.doctors
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 3. Get doctors from clinic by ID (with optional specialization filter)
app.get('/api/clinics/:clinicId/doctors', async (req, res) => {
  try {
    const clinicId = req.params.clinicId;
    const { specialization } = req.query;
    
    // Validate clinicId
    if (!mongoose.Types.ObjectId.isValid(clinicId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid clinic ID format' 
      });
    }
    
    const clinic = await Clinic.findById(clinicId);
    
    if (!clinic) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clinic not found' 
      });
    }
    
    let doctors = clinic.doctors;
    
    // Agar specialization query parameter hai toh filter karein
    if (specialization) {
      doctors = clinic.doctors.filter(doctor => 
        doctor.specialization.toLowerCase().includes(specialization.toLowerCase())
      );
    }
    
    res.json({
      success: true,
      clinicId: clinicId,
      clinicName: clinic.name,
      clinicCity: clinic.city,
      clinicAddress: clinic.address,
      clinicContact: clinic.contact,
      specialization: specialization || 'All',
      totalDoctors: doctors.length,
      doctors: doctors
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 4. Search doctors by specialization in a specific clinic
app.get('/api/clinics/:clinicId/doctors/search', async (req, res) => {
  try {
    const clinicId = req.params.clinicId;
    const { specialization } = req.query;
    
    if (!specialization) {
      return res.status(400).json({ 
        success: false, 
        message: 'Specialization parameter is required' 
      });
    }
    
    // Validate clinicId
    if (!mongoose.Types.ObjectId.isValid(clinicId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid clinic ID format' 
      });
    }
    
    const clinic = await Clinic.findById(clinicId);
    
    if (!clinic) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clinic not found' 
      });
    }
    
    // Filter doctors by specialization
    const filteredDoctors = clinic.doctors.filter(doctor => 
      doctor.specialization.toLowerCase().includes(specialization.toLowerCase())
    );
    
    res.json({
      success: true,
      clinicId: clinicId,
      clinicName: clinic.name,
      clinicCity: clinic.city,
      clinicAddress: clinic.address,
      specialization: specialization,
      totalDoctorsFound: filteredDoctors.length,
      doctors: filteredDoctors
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 5. Search all doctors by specialization and city
app.get('/api/doctors/search', async (req, res) => {
  try {
    const { specialization, city } = req.query;
    
    let query = {};
    
    // Agar city di gayi hai toh city-wise filter
    if (city) {
      query.city = { $regex: new RegExp(city, 'i') };
    }
    
    const clinics = await Clinic.find(query);
    
    let allDoctors = [];
    clinics.forEach(clinic => {
      clinic.doctors.forEach(doctor => {
        if (!specialization || 
            doctor.specialization.toLowerCase().includes(specialization.toLowerCase())) {
          allDoctors.push({
            doctor: doctor,
            clinicId: clinic._id,
            clinicName: clinic.name,
            clinicAddress: clinic.address,
            clinicCity: clinic.city,
            clinicContact: clinic.contact,
            clinicEmail: clinic.email
          });
        }
      });
    });
    
    res.json({
      success: true,
      filters: {
        specialization: specialization || 'All',
        city: city || 'All'
      },
      totalClinics: clinics.length,
      totalDoctors: allDoctors.length,
      results: allDoctors
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 6. Add new clinic (optional)
app.post('/api/clinics', async (req, res) => {
  try {
    const { name, city, address, contact, email, doctors } = req.body;
    
    if (!name || !city || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, city, and address are required'
      });
    }
    
    const newClinic = new Clinic({
      name,
      city,
      address,
      contact: contact || '',
      email: email || '',
      doctors: doctors || []
    });
    
    await newClinic.save();
    
    res.status(201).json({
      success: true,
      message: 'Clinic created successfully',
      clinic: newClinic
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 7. Add doctors to existing clinic
app.post('/api/clinics/:clinicId/doctors', async (req, res) => {
  try {
    const clinicId = req.params.clinicId;
    const { doctors } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(clinicId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid clinic ID format' 
      });
    }
    
    if (!doctors || !Array.isArray(doctors)) {
      return res.status(400).json({
        success: false,
        message: 'Doctors array is required'
      });
    }
    
    const clinic = await Clinic.findById(clinicId);
    
    if (!clinic) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clinic not found' 
      });
    }
    
    // Add new doctors to existing doctors
    clinic.doctors = [...clinic.doctors, ...doctors];
    await clinic.save();
    
    res.json({
      success: true,
      message: `Added ${doctors.length} doctors to clinic`,
      clinicId: clinicId,
      clinicName: clinic.name,
      totalDoctors: clinic.doctors.length
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 8. Root endpoint for API info
app.get('/', (req, res) => {
  res.json({
    message: 'Clinic Finder API',
    version: '1.0.0',
    endpoints: {
      getAllClinics: 'GET /api/clinics?city={city}',
      getClinicById: 'GET /api/clinics/{id}',
      getClinicDoctors: 'GET /api/clinics/{id}/doctors?specialization={spec}',
      searchDoctorsInClinic: 'GET /api/clinics/{id}/doctors/search?specialization={spec}',
      searchAllDoctors: 'GET /api/doctors/search?specialization={spec}&city={city}',
      addClinic: 'POST /api/clinics',
      addDoctorsToClinic: 'POST /api/clinics/{id}/doctors'
    }
  });
});
// POST: Clinic ID aur specialization se doctors search (body se)
app.post('/api/clinics/search-doctors', async (req, res) => {
  try {
    const { clinicId, specialization } = req.body;
    
    if (!clinicId || !specialization) {
      return res.status(400).json({ 
        success: false, 
        message: 'clinicId and specialization are required in body' 
      });
    }
    
    // Validate clinicId
    if (!mongoose.Types.ObjectId.isValid(clinicId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid clinic ID format' 
      });
    }
    
    const clinic = await Clinic.findById(clinicId);
    
    if (!clinic) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clinic not found' 
      });
    }
    
    // Filter doctors by specialization
    const filteredDoctors = clinic.doctors.filter(doctor => 
      doctor.specialization.toLowerCase().includes(specialization.toLowerCase())
    );
    
    res.json({
      success: true,
      clinicId: clinicId,
      clinicName: clinic.name,
      clinicCity: clinic.city,
      clinicAddress: clinic.address,
      specialization: specialization,
      totalDoctorsFound: filteredDoctors.length,
      doctors: filteredDoctors.map(doctor => ({
        name: doctor.name,
        specialization: doctor.specialization,
        experience: doctor.experience,
        qualification: doctor.qualification,
        consultation_fee: doctor.consultation_fee,
        availability: doctor.availability
      }))
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/`);
});
