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
      { pattern: 'ghaziabad', city: 'Ghaziabad' },
      { pattern: 'nagpur', city: 'Nagpur' }
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

// ==================== EXISTING ENDPOINTS ====================

// GET /api/clinics - ALL CLINICS WITH CITY FILTER
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

// GET /api/clinics/nearby/city - NEARBY CLINICS
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

// ==================== NEW SPECIALISTS ENDPOINTS ====================

// GET /api/clinics/specialists - Get specialists by city
router.get('/specialists', async (req, res) => {
  try {
    await connectDB();
    
    const { city, specialty } = req.query;
    
    // Get all clinics
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
    
    // Extract specialists
    const specialists = [];
    
    filteredClinics.forEach(clinic => {
      const clinicCity = extractCityFromDocument(clinic);
      
      if (clinic.specialities && Array.isArray(clinic.specialities)) {
        clinic.specialities.forEach(specialtyName => {
          // Filter by specialty if provided
          if (specialty && !specialtyName.toLowerCase().includes(specialty.toLowerCase())) {
            return;
          }
          
          // Determine clinic type
          let clinicType = 'individual';
          if (clinic.name.toLowerCase().includes('hospital') || 
              clinic.name.toLowerCase().includes('multispecialty') ||
              clinic.name.toLowerCase().includes('medical center')) {
            clinicType = 'multi-specialty';
          }
          
          specialists.push({
            clinicId: clinic._id,
            clinicName: clinic.name,
            clinicType: clinicType,
            city: clinicCity,
            address: clinic.address,
            phone: clinic.phone,
            specialty: specialtyName.trim(),
            rating: clinic.rating || 0,
            isEmergency: clinic.isEmergency || false,
            hasLocation: !!clinic.location
          });
        });
      }
    });
    
    // Group by specialty
    const groupedBySpecialty = {};
    specialists.forEach(spec => {
      if (!groupedBySpecialty[spec.specialty]) {
        groupedBySpecialty[spec.specialty] = [];
      }
      groupedBySpecialty[spec.specialty].push(spec);
    });
    
    // Format response
    const specialtiesList = Object.keys(groupedBySpecialty).sort();
    
    res.json({
      success: true,
      city: city || 'all',
      totalSpecialists: specialists.length,
      totalSpecialties: specialtiesList.length,
      specialties: specialtiesList,
      specialistsBySpecialty: groupedBySpecialty,
      summary: specialtiesList.map(spec => ({
        specialty: spec,
        count: groupedBySpecialty[spec].length,
        clinicTypes: {
          individual: groupedBySpecialty[spec].filter(s => s.clinicType === 'individual').length,
          multiSpecialty: groupedBySpecialty[spec].filter(s => s.clinicType === 'multi-specialty').length
        }
      }))
    });
    
  } catch (error) {
    console.error('Specialists API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

// GET /api/clinics/specialists/details - Detailed specialists with doctors
router.get('/specialists/details', async (req, res) => {
  try {
    await connectDB();
    
    const { city, specialty } = req.query;
    
    const allClinics = await Clinic.find({}).lean();
    
    // Filter by city
    let filteredClinics = allClinics;
    if (city) {
      const cityLower = city.toLowerCase();
      filteredClinics = allClinics.filter(clinic => {
        const clinicCity = extractCityFromDocument(clinic).toLowerCase();
        return clinicCity.includes(cityLower);
      });
    }
    
    // Generate detailed specialists data
    const detailedSpecialists = [];
    
    filteredClinics.forEach(clinic => {
      const clinicCity = extractCityFromDocument(clinic);
      
      if (clinic.specialities && Array.isArray(clinic.specialities)) {
        clinic.specialities.forEach(specialtyName => {
          // Filter by specialty if provided
          if (specialty && !specialtyName.toLowerCase().includes(specialty.toLowerCase())) {
            return;
          }
          
          // Generate doctors for this specialty
          const doctors = generateDetailedDoctors(specialtyName, clinic.name, clinicCity);
          
          if (doctors.length > 0) {
            detailedSpecialists.push({
              clinicInfo: {
                id: clinic._id,
                name: clinic.name,
                city: clinicCity,
                address: clinic.address,
                phone: clinic.phone,
                type: determineClinicType(clinic.name, clinic.specialities),
                rating: clinic.rating || 0
              },
              specialty: specialtyName,
              totalDoctors: doctors.length,
              doctors: doctors,
              consultationFee: calculateConsultationFee(specialtyName, clinic.rating)
            });
          }
        });
      }
    });
    
    // Sort by number of doctors
    detailedSpecialists.sort((a, b) => b.totalDoctors - a.totalDoctors);
    
    res.json({
      success: true,
      city: city || 'all',
      specialty: specialty || 'all',
      totalClinics: detailedSpecialists.length,
      totalDoctors: detailedSpecialists.reduce((sum, item) => sum + item.totalDoctors, 0),
      specialists: detailedSpecialists,
      categories: {
        individualSpecialists: detailedSpecialists.filter(s => s.clinicInfo.type === 'individual').length,
        multiSpecialtyClinics: detailedSpecialists.filter(s => s.clinicInfo.type === 'multi-specialty').length,
        hospitals: detailedSpecialists.filter(s => s.clinicInfo.type === 'hospital').length
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

// Distance calculation function
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  
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

// Helper function to determine clinic type
function determineClinicType(clinicName, specialities) {
  const nameLower = clinicName.toLowerCase();
  
  if (nameLower.includes('hospital') || nameLower.includes('medicity') || nameLower.includes('institute')) {
    return 'hospital';
  }
  
  if (specialities && specialities.length > 5) {
    return 'multi-specialty';
  }
  
  if (specialities && specialities.length === 1) {
    return 'individual';
  }
  
  return 'clinic';
}

// Helper function to generate detailed doctors
function generateDetailedDoctors(specialty, clinicName, city) {
  const doctors = [];
  
  // Specialties with their specific doctor names
  const specialtyDetails = {
    'Cardiology': {
      names: ['Dr. Rajesh Sharma', 'Dr. Priya Verma', 'Dr. Amit Reddy', 'Dr. Neha Kapoor'],
      qualifications: ['DM Cardiology', 'MD Medicine', 'FICC', 'DNB Cardiology'],
      experiences: [15, 12, 18, 10]
    },
    'Neurology': {
      names: ['Dr. Anil Patel', 'Dr. Sunita Kumar', 'Dr. Ravi Joshi', 'Dr. Meera Nair'],
      qualifications: ['DM Neurology', 'MD Medicine', 'FNCSI', 'DNB Neurology'],
      experiences: [14, 16, 12, 9]
    },
    'Orthopedics': {
      names: ['Dr. Vikram Singh', 'Dr. Anjali Gupta', 'Dr. Sanjay Malhotra', 'Dr. Pooja Choudhary'],
      qualifications: ['MS Orthopedics', 'MCh Ortho', 'DNB Ortho', 'FRCS'],
      experiences: [20, 15, 18, 11]
    },
    'Pediatrics': {
      names: ['Dr. Arvind Desai', 'Dr. Swati Iyer', 'Dr. Karan Mehta', 'Dr. Naina Rao'],
      qualifications: ['MD Pediatrics', 'DNB Pediatrics', 'MRCPCH', 'FIAP'],
      experiences: [13, 17, 10, 8]
    },
    'General Medicine': {
      names: ['Dr. Ramesh Tiwari', 'Dr. Smita Mishra', 'Dr. Alok Saxena', 'Dr. Kavita Dubey'],
      qualifications: ['MD Medicine', 'DNB Medicine', 'MRCP', 'FCPS'],
      experiences: [25, 14, 19, 12]
    },
    'Surgery': {
      names: ['Dr. Mahesh Yadav', 'Dr. Rekha Pandey', 'Dr. Nitin Tripathi', 'Dr. Sneha Jha'],
      qualifications: ['MS Surgery', 'MCh', 'FRCS', 'DNB Surgery'],
      experiences: [22, 16, 13, 9]
    },
    'Emergency': {
      names: ['Dr. Rohit Basu', 'Dr. Ananya Sen', 'Dr. Vikas Ghosh', 'Dr. Priyanka Roy'],
      qualifications: ['MD Emergency Medicine', 'FNB Emergency', 'MNAMS', 'DEM'],
      experiences: [10, 8, 12, 7]
    },
    'ICU': {
      names: ['Dr. Ankit Das', 'Dr. Shweta Banerjee', 'Dr. Rajeev Mukherjee', 'Dr. Preeti Dutta'],
      qualifications: ['DM Critical Care', 'IDCCM', 'FICCM', 'EDIC'],
      experiences: [11, 9, 14, 8]
    }
  };
  
  // Find matching specialty
  let matchedSpec = null;
  for (const [key, details] of Object.entries(specialtyDetails)) {
    if (specialty.toLowerCase().includes(key.toLowerCase())) {
      matchedSpec = { ...details, specialty: key };
      break;
    }
  }
  
  // Default to General Medicine if no match
  if (!matchedSpec) {
    matchedSpec = {
      ...specialtyDetails['General Medicine'],
      specialty: 'General Medicine'
    };
  }
  
  // Determine number of doctors based on clinic
  let doctorCount = 1;
  if (clinicName.toLowerCase().includes('hospital') || clinicName.toLowerCase().includes('multispecialty')) {
    doctorCount = Math.min(3, matchedSpec.names.length);
  }
  
  // Generate doctors
  for (let i = 0; i < doctorCount; i++) {
    const isIndividual = doctorCount === 1;
    
    doctors.push({
      id: `dr_${city.toLowerCase()}_${matchedSpec.specialty.toLowerCase()}_${i}`,
      name: matchedSpec.names[i],
      specialty: matchedSpec.specialty,
      subSpecialty: getSubSpecialty(matchedSpec.specialty),
      qualification: matchedSpec.qualifications[i],
      experience: matchedSpec.experiences[i],
      consultationFee: calculateConsultationFee(matchedSpec.specialty, matchedSpec.experiences[i]),
      availableDays: getAvailableDays(i),
      timings: getConsultationTimings(i),
      clinicType: isIndividual ? 'individual' : 'multi-specialty',
      rating: (Math.random() * 1.5 + 3.5).toFixed(1),
      languages: ['Hindi', 'English', getRegionalLanguage(city)],
      isAcceptingNewPatients: Math.random() > 0.3
    });
  }
  
  return doctors;
}

// Helper function to get sub-specialty
function getSubSpecialty(specialty) {
  const subSpecialties = {
    'Cardiology': ['Interventional', 'Non-Invasive', 'Pediatric Cardiology'],
    'Neurology': ['Stroke', 'Epilepsy', 'Movement Disorders'],
    'Orthopedics': ['Joint Replacement', 'Spine', 'Sports Medicine'],
    'Pediatrics': ['Neonatology', 'Pediatric Cardiology', 'Pediatric Neurology'],
    'Surgery': ['General Surgery', 'Laparoscopic', 'Onco Surgery']
  };
  return subSpecialties[specialty] ? subSpecialties[specialty][Math.floor(Math.random() * subSpecialties[specialty].length)] : null;
}

// Helper function to get available days
function getAvailableDays(doctorIndex) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const start = doctorIndex % days.length;
  return days.slice(start, start + 4);
}

// Helper function to get consultation timings
function getConsultationTimings(doctorIndex) {
  const shifts = [
    '10:00 AM - 2:00 PM',
    '2:00 PM - 6:00 PM', 
    '9:00 AM - 1:00 PM',
    '4:00 PM - 8:00 PM'
  ];
  return shifts[doctorIndex % shifts.length];
}

// Helper function to get regional language
function getRegionalLanguage(city) {
  const cityLanguages = {
    'delhi': 'Punjabi',
    'mumbai': 'Marathi',
    'chennai': 'Tamil',
    'bangalore': 'Kannada',
    'kolkata': 'Bengali',
    'hyderabad': 'Telugu',
    'pune': 'Marathi',
    'jaipur': 'Rajasthani',
    'gurugram': 'Haryanvi',
    'nagpur': 'Marathi',
    'mathura': 'Braj'
  };
  return cityLanguages[city.toLowerCase()] || 'Local Language';
}

// Helper function to calculate consultation fee
function calculateConsultationFee(specialty, experience) {
  const baseFees = {
    'Cardiology': 1500,
    'Neurology': 1400,
    'Orthopedics': 1200,
    'Pediatrics': 800,
    'General Medicine': 700,
    'Surgery': 1600,
    'Emergency': 1000,
    'ICU': 1100
  };
  
  const baseFee = baseFees[specialty] || 1000;
  const experienceMultiplier = 1 + (experience / 100);
  
  return Math.round(baseFee * experienceMultiplier);
}

// GET /api/clinics/test - TEST ENDPOINT
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Clinic API is working with specialists features!',
    endpoints: {
      allClinics: 'GET /api/clinics',
      nearbyClinics: 'GET /api/clinics/nearby/city?city=delhi',
      specialists: 'GET /api/clinics/specialists?city=nagpur',
      specialistsDetails: 'GET /api/clinics/specialists/details?city=nagpur&specialty=Cardiology',
      citiesList: 'GET /api/clinics/cities',
      debug: 'GET /api/clinics/debug'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
