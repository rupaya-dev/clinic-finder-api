const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// City to Coordinates mapping (Indian cities)
const cityCoordinates = {
  // Delhi/NCR
  "delhi": { lat: 28.6139, lng: 77.2090 },
  "new delhi": { lat: 28.6139, lng: 77.2090 },
  "noida": { lat: 28.5355, lng: 77.3910 },
  "gurgaon": { lat: 28.4595, lng: 77.0266 },
  "gurugram": { lat: 28.4595, lng: 77.0266 },
  "faridabad": { lat: 28.4089, lng: 77.3178 },
  "ghaziabad": { lat: 28.6692, lng: 77.4538 },
  
  // Mumbai
  "mumbai": { lat: 19.0760, lng: 72.8777 },
  "navi mumbai": { lat: 19.0330, lng: 73.0297 },
  "thane": { lat: 19.2183, lng: 72.9781 },
  
  // Bangalore
  "bangalore": { lat: 12.9716, lng: 77.5946 },
  "bengaluru": { lat: 12.9716, lng: 77.5946 },
  
  // Chennai
  "chennai": { lat: 13.0827, lng: 80.2707 },
  "madras": { lat: 13.0827, lng: 80.2707 },
  
  // Kolkata
  "kolkata": { lat: 22.5726, lng: 88.3639 },
  "calcutta": { lat: 22.5726, lng: 88.3639 },
  
  // Hyderabad
  "hyderabad": { lat: 17.3850, lng: 78.4867 },
  "secunderabad": { lat: 17.4399, lng: 78.4983 },
  
  // Pune
  "pune": { lat: 18.5204, lng: 73.8567 },
  "pimpri chinchwad": { lat: 18.6279, lng: 73.8004 },
  
  // Ahmedabad
  "ahmedabad": { lat: 23.0225, lng: 72.5714 },
  
  // Jaipur
  "jaipur": { lat: 26.9124, lng: 75.7873 },
  
  // Lucknow
  "lucknow": { lat: 26.8467, lng: 80.9462 },
  
  // Chandigarh
  "chandigarh": { lat: 30.7333, lng: 76.7794 },
  
  // Dehradun
  "dehradun": { lat: 30.3165, lng: 78.0322 },
  
  // Indore
  "indore": { lat: 22.7196, lng: 75.8577 },
  
  // Bhopal
  "bhopal": { lat: 23.2599, lng: 77.4126 },
  
  // Surat
  "surat": { lat: 21.1702, lng: 72.8311 },
  
  // Vadodara
  "vadodara": { lat: 22.3072, lng: 73.1812 },
  
  // Nagpur
  "nagpur": { lat: 21.1458, lng: 79.0882 },
  
  // Coimbatore
  "coimbatore": { lat: 11.0168, lng: 76.9558 },
  
  // Kochi
  "kochi": { lat: 9.9312, lng: 76.2673 },
  "cochin": { lat: 9.9312, lng: 76.2673 },
  
  // Visakhapatnam
  "visakhapatnam": { lat: 17.6868, lng: 83.2185 },
  "vizag": { lat: 17.6868, lng: 83.2185 },
  
  // Patna
  "patna": { lat: 25.5941, lng: 85.1376 },
  
  // Guwahati
  "guwahati": { lat: 26.1445, lng: 91.7362 },
  
  // Bhubaneswar
  "bhubaneswar": { lat: 20.2961, lng: 85.8245 },
  
  // Ranchi
  "ranchi": { lat: 23.3441, lng: 85.3096 },
  
  // Raipur
  "raipur": { lat: 21.2514, lng: 81.6296 },
  
  // Jalandhar
  "jalandhar": { lat: 31.3260, lng: 75.5762 },
  
  // Amritsar
  "amritsar": { lat: 31.6340, lng: 74.8723 },
  
  // Ludhiana
  "ludhiana": { lat: 30.9010, lng: 75.8573 },
  
  // Kanpur
  "kanpur": { lat: 26.4499, lng: 80.3319 },
  
  // Allahabad
  "prayagraj": { lat: 25.4358, lng: 81.8463 },
  "allahabad": { lat: 25.4358, lng: 81.8463 },
  
  // Varanasi
  "varanasi": { lat: 25.3176, lng: 82.9739 },
  "banaras": { lat: 25.3176, lng: 82.9739 },
  
  // Agra
  "agra": { lat: 27.1767, lng: 78.0081 },
  
  // Meerut
  "meerut": { lat: 28.9845, lng: 77.7064 },
  
  // Kota
  "kota": { lat: 25.2138, lng: 75.8648 },
  
  // Mathura
  "mathura": { lat: 27.4924, lng: 77.6739 }
};

// Clinic Schema - MATCHING YOUR DATABASE STRUCTURE
const clinicSchema = new mongoose.Schema({
  name: String,
  address: mongoose.Schema.Types.Mixed, // Can be String or Object
  city: String,  // Direct city field (as in your data)
  phone: String,
  specialities: [String],  // Note: "specialities" not "specialties"
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number]
  },
  rating: Number,
  isEmergency: Boolean,
  isActive: { type: Boolean, default: true }
}, { strict: false });  // Allow additional fields

// Create 2dsphere index for geospatial queries
clinicSchema.index({ location: '2dsphere' });

const Clinic = mongoose.models.Clinic || mongoose.model('Clinic', clinicSchema);

// Connect to DB
async function connectDB() {
  if (mongoose.connections[0].readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://haldharsinghepic_db_user:123456789101112@cluster0.tektwpr.mongodb.net/rupaya");
}

// Helper function to extract city from document
function extractCityFromDocument(doc) {
  // Priority 1: Direct city field
  if (doc.city && doc.city.trim()) {
    return doc.city.trim();
  }
  
  // Priority 2: Address string parsing
  if (typeof doc.address === 'string') {
    const address = doc.address.toLowerCase();
    
    // List of common city names to search for
    const cityPatterns = [
      { pattern: 'gurugram', city: 'Gurugram' },
      { pattern: 'gurgaon', city: 'Gurugram' },
      { pattern: 'delhi', city: 'Delhi' },
      { pattern: 'new delhi', city: 'Delhi' },
      { pattern: 'mumbai', city: 'Mumbai' },
      { pattern: 'bombay', city: 'Mumbai' },
      { pattern: 'bangalore', city: 'Bangalore' },
      { pattern: 'bengaluru', city: 'Bangalore' },
      { pattern: 'chennai', city: 'Chennai' },
      { pattern: 'madras', city: 'Chennai' },
      { pattern: 'kolkata', city: 'Kolkata' },
      { pattern: 'calcutta', city: 'Kolkata' },
      { pattern: 'hyderabad', city: 'Hyderabad' },
      { pattern: 'pune', city: 'Pune' },
      { pattern: 'jaipur', city: 'Jaipur' },
      { pattern: 'mathura', city: 'Mathura' },
      { pattern: 'noida', city: 'Noida' },
      { pattern: 'faridabad', city: 'Faridabad' },
      { pattern: 'ghaziabad', city: 'Ghaziabad' }
    ];
    
    for (const { pattern, city } of cityPatterns) {
      if (address.includes(pattern)) {
        return city;
      }
    }
    
    // Try to extract from comma-separated address
    const parts = doc.address.split(',');
    if (parts.length >= 2) {
      // Usually city is second last part in Indian addresses
      return parts[parts.length - 2].trim();
    }
    
    return doc.address;
  }
  
  // Priority 3: Address object with city field
  if (doc.address && typeof doc.address === 'object' && doc.address.city) {
    return doc.address.city;
  }
  
  return 'Unknown';
}

// GET /api/clinics - ALL CLINICS WITH CITY FILTER (FIXED)
router.get('/', async (req, res) => {
  try {
    await connectDB();
    
    const { city } = req.query;
    
    // Get ALL clinics first
    const allClinics = await Clinic.find({}).lean();
    
    // Filter by city if provided
    let filteredClinics = allClinics;
    if (city) {
      const cityLower = city.toLowerCase();
      
      filteredClinics = allClinics.filter(clinic => {
        const clinicCity = extractCityFromDocument(clinic).toLowerCase();
        return clinicCity.includes(cityLower);
      });
    }
    
    // Format response
    const formattedClinics = filteredClinics.map(clinic => {
      const extractedCity = extractCityFromDocument(clinic);
      
      return {
        id: clinic._id,
        name: clinic.name,
        city: extractedCity,
        address: clinic.address,
        phone: clinic.phone,
        specialities: clinic.specialities || [],
        rating: clinic.rating || 0,
        isEmergency: clinic.isEmergency || false,
        hasLocation: !!clinic.location,
        coordinates: clinic.location?.coordinates || null
      };
    });
    
    res.json({
      success: true,
      totalInDatabase: allClinics.length,
      filteredCount: formattedClinics.length,
      searchCity: city || 'all',
      clinics: formattedClinics
    });
    
  } catch (error) {
    console.error('Clinics API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

// GET /api/clinics/nearby/city - NEARBY CLINICS (FIXED)
router.get('/nearby/city', async (req, res) => {
  try {
    await connectDB();
    
    const { city, maxDistance = 50000, limit = 50 } = req.query;
    
    if (!city) {
      return res.status(400).json({
        success: false,
        message: 'City name is required',
        example: '/api/clinics/nearby/city?city=gurugram'
      });
    }
    
    const cityLower = city.toLowerCase().trim();
    const cityData = cityCoordinates[cityLower];
    
    if (!cityData) {
      return res.status(404).json({
        success: false,
        message: `City "${city}" coordinates not available`,
        supportedCities: Object.keys(cityCoordinates).sort().join(', ')
      });
    }
    
    const { lat: latitude, lng: longitude } = cityData;
    
    // Find clinics with location near the city
    const clinics = await Clinic.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    })
    .limit(parseInt(limit))
    .lean();
    
    // Calculate distances and format
    const clinicsWithDistance = clinics.map(clinic => {
      const distance = calculateDistance(
        latitude,
        longitude,
        clinic.location.coordinates[1],
        clinic.location.coordinates[0]
      );
      
      const extractedCity = extractCityFromDocument(clinic);
      
      return {
        id: clinic._id,
        name: clinic.name,
        city: extractedCity,
        address: clinic.address,
        phone: clinic.phone,
        specialities: clinic.specialities || [],
        distance: {
          km: parseFloat(distance.toFixed(2)),
          meters: Math.round(distance * 1000)
        },
        coordinates: clinic.location.coordinates
      };
    });
    
    // Sort by distance
    clinicsWithDistance.sort((a, b) => a.distance.meters - b.distance.meters);
    
    res.json({
      success: true,
      searchCity: city,
      coordinates: { latitude, longitude },
      maxDistance: `${maxDistance} meters`,
      count: clinicsWithDistance.length,
      clinics: clinicsWithDistance
    });
    
  } catch (error) {
    console.error('Nearby City API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

// GET /api/clinics/cities - LIST ALL AVAILABLE CITIES
router.get('/cities', async (req, res) => {
  try {
    await connectDB();
    
    const allClinics = await Clinic.find({}).lean();
    
    // Extract cities from all documents
    const cityMap = {};
    allClinics.forEach(clinic => {
      const city = extractCityFromDocument(clinic);
      cityMap[city] = (cityMap[city] || 0) + 1;
    });
    
    // Convert to array and sort
    const cities = Object.entries(cityMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    res.json({
      success: true,
      totalClinics: allClinics.length,
      uniqueCities: cities.length,
      cities: cities
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/clinics/debug - DEBUG DOCUMENT STRUCTURE
router.get('/debug', async (req, res) => {
  try {
    await connectDB();
    
    const sampleDocs = await Clinic.find().limit(3).lean();
    
    const analysis = sampleDocs.map(doc => ({
      id: doc._id,
      name: doc.name,
      fields: Object.keys(doc),
      cityField: doc.city,
      addressType: typeof doc.address,
      addressValue: doc.address,
      extractedCity: extractCityFromDocument(doc),
      hasLocation: !!doc.location
    }));
    
    const totalCount = await Clinic.countDocuments();
    const withLocation = await Clinic.countDocuments({ location: { $exists: true } });
    const withCityField = await Clinic.countDocuments({ city: { $exists: true, $ne: '' } });
    
    res.json({
      success: true,
      totalDocuments: totalCount,
      withLocationField: withLocation,
      withCityField: withCityField,
      sampleDocuments: analysis,
      recommendation: 'Using extractCityFromDocument() function'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/clinics/test-data - ADD SAMPLE DATA
router.post('/test-data', async (req, res) => {
  try {
    await connectDB();
    
    // Check if data already exists
    const existingCount = await Clinic.countDocuments();
    if (existingCount > 0) {
      return res.json({
        success: true,
        message: 'Database already has data',
        existingCount: existingCount,
        action: 'No data added'
      });
    }
    
    const sampleClinics = [
      {
        name: "Artemis Hospital",
        address: "Sector 51, Gurugram, Haryana",
        city: "gurugram",
        phone: "0124-6767000",
        specialities: ["Emergency", "ICU", "Surgery"],
        location: {
          type: "Point",
          coordinates: [77.0931, 28.4326]
        },
        rating: 4.7,
        isEmergency: true,
        isActive: true
      },
      {
        name: "Medanta Medicity",
        address: "Sector 38, Gurugram, Haryana",
        city: "gurugram",
        phone: "0124-4141414",
        specialities: ["Cardiology", "Oncology", "Transplant"],
        location: {
          type: "Point",
          coordinates: [77.0266, 28.4595]
        },
        rating: 4.8,
        isEmergency: true,
        isActive: true
      },
      {
        name: "Max Hospital Saket",
        address: "Press Enclave Road, Saket, Delhi",
        city: "delhi",
        phone: "011-26515050",
        specialities: ["Cardiology", "Neurology", "Orthopedics"],
        location: {
          type: "Point",
          coordinates: [77.2090, 28.6139]
        },
        rating: 4.5,
        isEmergency: true,
        isActive: true
      },
      {
        name: "Apollo Hospital Delhi",
        address: "Mathura Road, Sarita Vihar, Delhi",
        city: "delhi",
        phone: "011-29871090",
        specialities: ["Multispecialty", "Emergency"],
        location: {
          type: "Point",
          coordinates: [77.2910, 28.5339]
        },
        rating: 4.6,
        isEmergency: true,
        isActive: true
      },
      {
        name: "Mathura Medical Center",
        address: "Near Krishna Janmabhoomi, Mathura",
        city: "mathura",
        phone: "0565-2401234",
        specialities: ["General Medicine", "Pediatrics"],
        location: {
          type: "Point",
          coordinates: [77.6739, 27.4924]
        },
        rating: 4.2,
        isEmergency: true,
        isActive: true
      }
    ];
    
    await Clinic.insertMany(sampleClinics);
    
    res.json({
      success: true,
      message: "Sample data added successfully",
      added: sampleClinics.length,
      cities: [...new Set(sampleClinics.map(c => c.city))]
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/clinics/fix-cities - ADD CITY FIELD TO EXISTING DOCUMENTS
router.post('/fix-cities', async (req, res) => {
  try {
    await connectDB();
    
    const allClinics = await Clinic.find({}).lean();
    let updatedCount = 0;
    
    for (const clinic of allClinics) {
      const extractedCity = extractCityFromDocument(clinic);
      
      // Update if city field is missing or different
      if (!clinic.city || clinic.city.toLowerCase() !== extractedCity.toLowerCase()) {
        await Clinic.updateOne(
          { _id: clinic._id },
          { $set: { city: extractedCity } }
        );
        updatedCount++;
      }
    }
    
    res.json({
      success: true,
      updatedDocuments: updatedCount,
      totalDocuments: allClinics.length,
      message: `Updated city field in ${updatedCount} documents`
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/clinics/test - TEST ENDPOINT
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Clinic API is working!',
    endpoints: {
      allClinics: 'GET /api/clinics',
      nearbyClinics: 'GET /api/clinics/nearby/city?city=delhi',
      citiesList: 'GET /api/clinics/cities',
      debug: 'GET /api/clinics/debug',
      testData: 'POST /api/clinics/test-data',
      fixCities: 'POST /api/clinics/fix-cities'
    },
    timestamp: new Date().toISOString()
  });
});

// Distance calculation function (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * 
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

module.exports = router;
