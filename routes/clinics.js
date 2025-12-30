const express = require('express');
const router = express.Router();

// Try to require Clinic model
let Clinic;
try {
  Clinic = require('../models/clinic');
} catch (error) {
  console.log('⚠️ Clinic model not found');
  Clinic = null;
}

// Haversine formula for distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ==================== REAL LOCATION-BASED ENDPOINTS ====================

// 1. NEARBY CLINICS (Real location-based search)
// GET /api/clinics/nearby?lat=28.6139&lon=77.2090&radius=5000&limit=10
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lon, radius = 5000, limit = 10 } = req.query;
    
    // Validation
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Missing parameters. Required: lat, lon. Optional: radius (meters, default: 5000), limit (default: 10)'
      });
    }
    
    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);
    const searchRadius = parseFloat(radius);
    const resultLimit = parseInt(limit);
    
    // Coordinate validation
    if (isNaN(userLat) || isNaN(userLon) || userLat < -90 || userLat > 90 || userLon < -180 || userLon > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates. Valid range: lat: -90 to 90, lon: -180 to 180'
      });
    }
    
    console.log(`📍 Nearby search: [${userLat}, ${userLon}], radius: ${searchRadius}m`);
    
    // Database query
    if (Clinic) {
      try {
        const clinics = await Clinic.find({
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [userLon, userLat]  // MongoDB uses [longitude, latitude]
              },
              $maxDistance: searchRadius
            }
          }
        }).limit(resultLimit);
        
        // Add calculated distance to each clinic
        const clinicsWithDistance = clinics.map(clinic => {
          const distanceKm = calculateDistance(
            userLat,
            userLon,
            clinic.location.coordinates[1],  // latitude
            clinic.location.coordinates[0]   // longitude
          );
          
          return {
            id: clinic._id,
            name: clinic.name,
            address: clinic.address,
            city: clinic.city,
            phone: clinic.phone,
            distance: distanceKm,
            distance_display: `${distanceKm.toFixed(1)} km`,
            coordinates: {
              lat: clinic.location.coordinates[1],
              lon: clinic.location.coordinates[0]
            },
            specialities: clinic.specialities || [],
            opening_hours: clinic.opening_hours
          };
        });
        
        // Sort by distance
        clinicsWithDistance.sort((a, b) => a.distance - b.distance);
        
        return res.json({
          success: true,
          source: 'database',
          user_location: { lat: userLat, lon: userLon },
          search_radius: `${searchRadius/1000} km`,
          total_found: clinicsWithDistance.length,
          message: `Found ${clinicsWithDistance.length} clinic(s) within ${searchRadius/1000} km`,
          clinics: clinicsWithDistance
        });
        
      } catch (dbError) {
        console.error('Database query error:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Database error',
          error: process.env.NODE_ENV === 'production' ? null : dbError.message
        });
      }
    }
    
    // Fallback if no database
    res.json({
      success: true,
      source: 'fallback',
      message: 'Database not available. Using mock response.',
      user_location: { lat: userLat, lon: userLon },
      clinics: getMockClinicsNearby(userLat, userLon, searchRadius)
    });
    
  } catch (error) {
    console.error('📍 Nearby API error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
});

// 2. CITY + NEARBY (City filter with location sorting)
// GET /api/clinics/city-nearby?city=delhi&lat=28.5245&lon=77.2000&limit=5
router.get('/city-nearby', async (req, res) => {
  try {
    const { city, lat, lon, limit = 5 } = req.query;
    
    if (!city || !lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Required: city, lat, lon'
      });
    }
    
    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);
    
    if (Clinic) {
      const clinics = await Clinic.find({ 
        city: city.toLowerCase() 
      }).limit(parseInt(limit));
      
      // Calculate distance for each and sort
      const clinicsWithDistance = clinics.map(clinic => {
        const distanceKm = calculateDistance(
          userLat, userLon,
          clinic.location.coordinates[1],
          clinic.location.coordinates[0]
        );
        
        return {
          id: clinic._id,
          name: clinic.name,
          address: clinic.address,
          distance: distanceKm,
          distance_display: `${distanceKm.toFixed(1)} km`,
          phone: clinic.phone
        };
      });
      
      clinicsWithDistance.sort((a, b) => a.distance - b.distance);
      
      return res.json({
        success: true,
        city: city,
        user_location: { lat: userLat, lon: userLon },
        clinics: clinicsWithDistance
      });
    }
    
    // Fallback
    res.json({
      success: true,
      message: 'Using mock data',
      clinics: getMockClinicsByCity(city, userLat, userLon)
    });
    
  } catch (error) {
    console.error('City nearby error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 3. NEAREST CLINIC (Single closest)
// GET /api/clinics/nearest?lat=28.6139&lon=77.2090
router.get('/nearest', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) return res.status(400).json({ 
      success: false, 
      message: 'lat and lon required' 
    });
    
    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);
    
    if (Clinic) {
      const clinics = await Clinic.find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [userLon, userLat]
            }
          }
        }
      }).limit(1);
      
      if (clinics.length > 0) {
        const clinic = clinics[0];
        const distance = calculateDistance(
          userLat, userLon,
          clinic.location.coordinates[1],
          clinic.location.coordinates[0]
        );
        
        return res.json({
          success: true,
          source: 'database',
          message: 'Nearest clinic found',
          clinic: {
            id: clinic._id,
            name: clinic.name,
            address: clinic.address,
            city: clinic.city,
            phone: clinic.phone,
            distance: distance,
            distance_display: `${distance.toFixed(1)} km`,
            coordinates: {
              lat: clinic.location.coordinates[1],
              lon: clinic.location.coordinates[0]
            }
          },
          user_location: { lat: userLat, lon: userLon }
        });
      }
    }
    
    // Fallback
    const mockClinic = getMockNearestClinic(userLat, userLon);
    res.json({
      success: true,
      source: 'mock',
      message: 'Nearest clinic (mock data)',
      clinic: mockClinic
    });
    
  } catch (error) {
    console.error('Nearest error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== HELPER FUNCTIONS ====================

function getMockClinicsNearby(lat, lon, radius) {
  // Mock clinics with real Delhi coordinates
  const mockClinics = [
    {
      id: 1,
      name: "Max Hospital Saket",
      address: "Press Enclave Road, Saket, Delhi",
      city: "delhi",
      phone: "011-26515050",
      coordinates: { lat: 28.5245, lon: 77.2000 },
      distance: calculateDistance(lat, lon, 28.5245, 77.2000),
      specialities: ["Emergency", "Cardiology", "Orthopedics"]
    },
    {
      id: 2,
      name: "Apollo Clinic Sarita Vihar",
      address: "Sarita Vihar, Delhi",
      city: "delhi",
      phone: "011-29871090",
      coordinates: { lat: 28.5314, lon: 77.2923 },
      distance: calculateDistance(lat, lon, 28.5314, 77.2923),
      specialities: ["General Medicine", "Pediatrics"]
    },
    {
      id: 3,
      name: "AIIMS Hospital",
      address: "Ansari Nagar, Delhi",
      city: "delhi",
      phone: "011-26588500",
      coordinates: { lat: 28.5675, lon: 77.2100 },
      distance: calculateDistance(lat, lon, 28.5675, 77.2100),
      specialities: ["All Specialities", "Research"]
    }
  ];
  
  // Filter by radius and add distance display
  return mockClinics
    .filter(clinic => clinic.distance <= (radius/1000))
    .map(clinic => ({
      ...clinic,
      distance_display: `${clinic.distance.toFixed(1)} km`
    }))
    .sort((a, b) => a.distance - b.distance);
}

function getMockClinicsByCity(city, userLat, userLon) {
  const cityClinics = {
    'delhi': [
      { name: "Max Hospital", lat: 28.5245, lon: 77.2000 },
      { name: "Apollo Clinic", lat: 28.5314, lon: 77.2923 },
      { name: "AIIMS", lat: 28.5675, lon: 77.2100 }
    ],
    'mumbai': [
      { name: "Kokilaben Hospital", lat: 19.1185, lon: 72.8721 },
      { name: "Lilavati Hospital", lat: 19.0542, lon: 72.8302 }
    ]
  };
  
  const clinics = cityClinics[city.toLowerCase()] || [];
  
  return clinics.map(clinic => {
    const distance = calculateDistance(userLat, userLon, clinic.lat, clinic.lon);
    return {
      name: clinic.name,
      distance: distance,
      distance_display: `${distance.toFixed(1)} km`
    };
  }).sort((a, b) => a.distance - b.distance);
}

function getMockNearestClinic(lat, lon) {
  const clinics = [
    { name: "Max Hospital", lat: 28.5245, lon: 77.2000, address: "Saket, Delhi", phone: "011-26515050" },
    { name: "Apollo Clinic", lat: 28.5314, lon: 77.2923, address: "Sarita Vihar, Delhi", phone: "011-29871090" }
  ];
  
  let nearest = clinics[0];
  let minDistance = calculateDistance(lat, lon, nearest.lat, nearest.lon);
  
  clinics.forEach(clinic => {
    const distance = calculateDistance(lat, lon, clinic.lat, clinic.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = clinic;
    }
  });
  
  return {
    name: nearest.name,
    address: nearest.address,
    phone: nearest.phone,
    distance: minDistance,
    distance_display: `${minDistance.toFixed(1)} km`,
    coordinates: { lat: nearest.lat, lon: nearest.lon }
  };
}

// ==================== EXISTING CITY-BASED ENDPOINT ====================

// Keep existing city-based endpoint for backward compatibility
router.get('/', async (req, res) => {
  try {
    const city = req.query.city ? req.query.city.toLowerCase().trim() : 'delhi';
    
    console.log(`[API] City-based search: "${city}"`);
    
    if (Clinic) {
      try {
        const clinics = await Clinic.find({ city: city }).limit(20);
        
        if (clinics.length > 0) {
          return res.json({
            success: true,
            source: 'database',
            city: city,
            message: `Found ${clinics.length} clinics in ${city}`,
            clinics: clinics.map(clinic => ({
              id: clinic._id,
              name: clinic.name,
              address: clinic.address,
              phone: clinic.phone,
              specialities: clinic.specialities
            }))
          });
        }
      } catch (dbError) {
        console.log('DB error, using fallback:', dbError.message);
      }
    }
    
    // Fallback hardcoded data
    const fallbackClinics = {
      'delhi': [
        { id: 1, name: "Max Hospital", address: "Saket, Delhi", phone: "011-26515050" },
        { id: 2, name: "Apollo Clinic", address: "Sarita Vihar, Delhi", phone: "011-29871090" }
      ],
      'mumbai': [
        { id: 3, name: "Kokilaben Hospital", address: "Andheri, Mumbai", phone: "022-30919000" },
        { id: 4, name: "Lilavati Hospital", address: "Bandra, Mumbai", phone: "022-39999999" }
      ]
    };
    
    if (fallbackClinics[city]) {
      return res.json({
        success: true,
        source: 'fallback',
        city: city,
        message: `Found ${fallbackClinics[city].length} clinics in ${city}`,
        clinics: fallbackClinics[city]
      });
    }
    
    res.status(404).json({
      success: false,
      city: city,
      message: `No clinics found for "${city}"`,
      clinics: []
    });
    
  } catch (error) {
    console.error('City API error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
