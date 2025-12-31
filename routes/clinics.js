const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// City to Coordinates mapping
const cityCoordinates = {
  "delhi": { lat: 28.6139, lng: 77.2090 },
  "new delhi": { lat: 28.6139, lng: 77.2090 },
  "noida": { lat: 28.5355, lng: 77.3910 },
  "gurgaon": { lat: 28.4595, lng: 77.0266 },
  "gurugram": { lat: 28.4595, lng: 77.0266 },
  "faridabad": { lat: 28.4089, lng: 77.3178 },
  "ghaziabad": { lat: 28.6692, lng: 77.4538 },
  "mumbai": { lat: 19.0760, lng: 72.8777 },
  "bangalore": { lat: 12.9716, lng: 77.5946 },
  "chennai": { lat: 13.0827, lng: 80.2707 },
  "kolkata": { lat: 22.5726, lng: 88.3639 },
  "hyderabad": { lat: 17.3850, lng: 78.4867 },
  "pune": { lat: 18.5204, lng: 73.8567 },
  "jaipur": { lat: 26.9124, lng: 75.7873 }
};

// Clinic schema
const clinicSchema = new mongoose.Schema({
  name: String,
  address: Object,
  location: Object,
  contact: Object,
  specialties: [String],
  rating: Number,
  isEmergency: Boolean,
  isActive: Boolean
});

const Clinic = mongoose.model('Clinic', clinicSchema);

// Connect to DB
async function connectDB() {
  if (mongoose.connections[0].readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://haldharsinghepic_db_user:123456789101112@cluster0.tektwpr.mongodb.net/rupaya");
}

// GET /api/clinics/nearby/city
router.get('/nearby/city', async (req, res) => {
  try {
    await connectDB();
    
    const { city } = req.query;
    const maxDistance = parseFloat(req.query.maxDistance) || 10000;
    const limit = parseInt(req.query.limit) || 20;
    
    if (!city) {
      return res.status(400).json({
        success: false,
        message: 'City name is required',
        example: '/api/clinics/nearby/city?city=delhi'
      });
    }
    
    const cityLower = city.toLowerCase().trim();
    const cityData = cityCoordinates[cityLower];
    
    if (!cityData) {
      return res.status(404).json({
        success: false,
        message: `City "${city}" not found`,
        supportedCities: Object.keys(cityCoordinates).join(', ')
      });
    }
    
    const { lat: latitude, lng: longitude } = cityData;
    
    // Find clinics
    const clinics = await Clinic.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      },
      isActive: true
    })
    .limit(limit)
    .lean();
    
    // Calculate distances
    const clinicsWithDistance = clinics.map(clinic => {
      const distance = calculateDistance(
        latitude,
        longitude,
        clinic.location.coordinates[1],
        clinic.location.coordinates[0]
      );
      
      return {
        id: clinic._id.toString(),
        name: clinic.name,
        address: clinic.address,
        distance: `${distance.toFixed(2)} km`,
        rating: clinic.rating || 0
      };
    });
    
    res.json({
      success: true,
      city: city,
      count: clinicsWithDistance.length,
      clinics: clinicsWithDistance
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/clinics - सभी clinics (WITH CITY FILTER)
router.get('/', async (req, res) => {
  try {
    await connectDB();
    
    const { city } = req.query;
    let query = { isActive: true };
    
    // City filter
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }
    
    const clinics = await Clinic.find(query).lean();
    
    res.json({
      success: true,
      count: clinics.length,
      city: city || 'all',
      clinics: clinics.map(c => ({
        id: c._id,
        name: c.name,
        address: c.address,
        contact: c.contact,
        specialties: c.specialties || []
      }))
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/clinics/test-data - Add test data
router.post('/test-data', async (req, res) => {
  try {
    await connectDB();
    
    const sampleClinics = [
      {
        name: "Max Hospital",
        address: {
          street: "Saket",
          city: "Delhi",
          state: "Delhi",
          pincode: "110017"
        },
        location: {
          type: "Point",
          coordinates: [77.2090, 28.6139]
        },
        contact: {
          phone: "011-26515050",
          email: "info@max.com"
        },
        specialties: ["Cardiology", "Neurology"],
        rating: 4.5,
        isEmergency: true,
        isActive: true
      },
      {
        name: "City Clinic",
        address: {
          street: "MG Road",
          city: "Mathura",
          state: "UP",
          pincode: "281001"
        },
        location: {
          type: "Point",
          coordinates: [77.6739, 27.4924]
        },
        contact: {
          phone: "0565-2401234",
          email: "info@cityclinic.com"
        },
        specialties: ["General"],
        rating: 4.0,
        isEmergency: true,
        isActive: true
      }
    ];
    
    await Clinic.deleteMany({});
    await Clinic.insertMany(sampleClinics);
    
    res.json({
      success: true,
      message: 'Test data added',
      clinics: sampleClinics.length
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'API working',
    timestamp: new Date().toISOString()
  });
});

// Distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = router;
