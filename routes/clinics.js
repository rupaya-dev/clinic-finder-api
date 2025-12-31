const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// City to Coordinates mapping (Indian cities) - EXISTING
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
  "chandigarh": { lat: 30.7333, lng: 76.7794 }
};

// Clinic schema - EXISTING
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

const Clinic = mongoose.models.Clinic || mongoose.model('Clinic', clinicSchema);

// NEW: Doctor Schema
const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: String,
  qualification: String,
  experience: Number,
  consultationFee: Number,
  availableSlots: [{
    day: String,
    startTime: String,
    endTime: String
  }],
  clinicType: {
    type: String,
    enum: ['individual', 'multi-branch', 'both'],
    default: 'individual'
  },
  clinics: [{
    clinicId: String,
    name: String,
    type: { type: String, enum: ['individual', 'branch'] },
    address: Object,
    contact: Object,
    isPrimary: { type: Boolean, default: false }
  }],
  rating: { type: Number, default: 0 },
  reviews: [{
    patientName: String,
    rating: Number,
    comment: String,
    date: { type: Date, default: Date.now }
  }],
  isActive: { type: Boolean, default: true }
});

const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);

// Connect to DB - EXISTING
async function connectDB() {
  if (mongoose.connections[0].readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://haldharsinghepic_db_user:123456789101112@cluster0.tektwpr.mongodb.net/rupaya");
}

// ==================== EXISTING ENDPOINTS ====================

// GET /api/clinics/nearby/city - EXISTING
router.get('/nearby/city', async (req, res) => {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    let city = searchParams.get('city');
    const maxDistance = parseFloat(searchParams.get('maxDistance')) || 10000;
    const limit = parseInt(searchParams.get('limit')) || 20;
    
    // Validate
    if (!city) {
      return res.status(400).json({
        success: false,
        message: 'City name is required',
        example: '/api/clinics/nearby/city?city=delhi',
        supportedCities: Object.keys(cityCoordinates).join(', ')
      });
    }
    
    // Convert city name to lowercase for matching
    city = city.toLowerCase().trim();
    
    // Get coordinates for city
    const cityData = cityCoordinates[city];
    
    if (!cityData) {
      return res.status(404).json({
        success: false,
        message: `City "${city}" not found in our database`,
        supportedCities: Object.keys(cityCoordinates).sort().join(', '),
        suggestion: 'Please use one of the supported cities'
      });
    }
    
    const { lat: latitude, lng: longitude } = cityData;
    
    // Ensure index
    try {
      await Clinic.collection.createIndex({ location: '2dsphere' });
    } catch (e) {}
    
    // Find clinics near city
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
        contact: clinic.contact,
        specialties: clinic.specialties || [],
        rating: clinic.rating || 0,
        isEmergency: clinic.isEmergency || false,
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
      count: clinicsWithDistance.length,
      data: clinicsWithDistance,
      searchInfo: {
        city: city,
        coordinates: { latitude, longitude },
        maxDistance: `${maxDistance} meters`,
        limit: limit
      },
      message: `Found ${clinicsWithDistance.length} clinics near ${city}`
    });
    
  } catch (error) {
    console.error('City API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/clinics - All clinics - EXISTING
router.get('/', async (req, res) => {
  try {
    await connectDB();
    const clinics = await Clinic.find({ isActive: true }).lean();
    
    res.json({
      success: true,
      count: clinics.length,
      clinics: clinics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/clinics/:id - Specific clinic - EXISTING
router.get('/:id', async (req, res) => {
  try {
    await connectDB();
    const clinic = await Clinic.findById(req.params.id).lean();
    
    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: 'Clinic not found'
      });
    }
    
    res.json({
      success: true,
      clinic: clinic
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== NEW DOCTOR ENDPOINTS ====================

// GET /api/clinics/doctors - Find doctors with clinic selection logic
router.get('/doctors', async (req, res) => {
  try {
    await connectDB();
    
    const { city, specialization, clinicType } = req.query;
    
    let query = { isActive: true };
    
    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }
    
    if (clinicType) {
      query.clinicType = clinicType;
    }
    
    const doctors = await Doctor.find(query).lean();
    
    // Filter by city if provided
    let filteredDoctors = doctors;
    if (city) {
      filteredDoctors = doctors.filter(doctor => 
        doctor.clinics.some(clinic => 
          clinic.address && 
          clinic.address.city && 
          clinic.address.city.toLowerCase().includes(city.toLowerCase())
        )
      );
    }
    
    // Categorize doctors based on clinic type
    const categorizedDoctors = filteredDoctors.map(doctor => {
      const individualClinics = doctor.clinics.filter(c => c.type === 'individual');
      const branchClinics = doctor.clinics.filter(c => c.type === 'branch');
      
      // Determine selection type
      let selectionType = '';
      if (individualClinics.length > 0 && branchClinics.length === 0) {
        selectionType = 'auto';
      } else if (branchClinics.length > 0 && individualClinics.length === 0) {
        selectionType = 'manual';
      } else if (individualClinics.length > 0 && branchClinics.length > 0) {
        selectionType = 'both';
      } else {
        selectionType = 'unknown';
      }
      
      return {
        doctorId: doctor._id,
        name: doctor.name,
        specialization: doctor.specialization,
        experience: doctor.experience,
        consultationFee: doctor.consultationFee,
        rating: doctor.rating,
        availableSlots: doctor.availableSlots,
        clinicInfo: {
          totalClinics: doctor.clinics.length,
          individualClinics: individualClinics.length,
          branchClinics: branchClinics.length,
          clinicType: doctor.clinicType,
          selectionType: selectionType
        },
        clinics: doctor.clinics.map(clinic => ({
          clinicId: clinic.clinicId,
          name: clinic.name,
          type: clinic.type,
          address: clinic.address,
          isPrimary: clinic.isPrimary
        })),
        selectionLogic: {
          ifIndividualClinic: individualClinics.length === 1 
            ? `Auto-select: ${individualClinics[0].name}` 
            : individualClinics.length > 1
            ? `Choose from ${individualClinics.length} individual clinics`
            : null,
          ifMultiBranch: branchClinics.length > 0
            ? `Choose from ${branchClinics.length} branches`
            : null,
          autoSelectionAvailable: individualClinics.length === 1 && branchClinics.length === 0
        }
      };
    });
    
    res.json({
      success: true,
      count: categorizedDoctors.length,
      selectionLogic: {
        individualClinic: 'Auto-selected if only one individual clinic',
        multiBranchClinic: 'Manual branch selection required',
        bothTypes: 'Show all options for user choice'
      },
      doctors: categorizedDoctors
    });
    
  } catch (error) {
    console.error('Doctors API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

// POST /api/clinics/select-doctor - Select doctor with clinic
router.post('/select-doctor', async (req, res) => {
  try {
    await connectDB();
    
    const { doctorId, clinicId, branchId } = req.body;
    
    const doctor = await Doctor.findById(doctorId).lean();
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    // Find individual and branch clinics
    const individualClinics = doctor.clinics.filter(c => c.type === 'individual');
    const branchClinics = doctor.clinics.filter(c => c.type === 'branch');
    
    let selectedClinic = null;
    let selectionType = '';
    let message = '';
    
    // Logic 1: If doctor has only one individual clinic → Auto-select
    if (individualClinics.length === 1 && branchClinics.length === 0) {
      selectedClinic = individualClinics[0];
      selectionType = 'auto';
      message = 'Individual clinic auto-selected';
    }
    // Logic 2: If clinicId is provided in request
    else if (clinicId) {
      selectedClinic = doctor.clinics.find(c => c.clinicId === clinicId);
      
      if (!selectedClinic) {
        return res.status(400).json({
          success: false,
          error: 'Doctor not available at this clinic'
        });
      }
      
      if (selectedClinic.type === 'individual') {
        selectionType = 'auto';
        message = 'Individual clinic selected';
      } else if (selectedClinic.type === 'branch') {
        if (!branchId) {
          // Return branch options
          const otherBranches = branchClinics.filter(b => b.clinicId !== clinicId);
          return res.json({
            success: true,
            selectionType: 'branch-selection-required',
            message: 'Please select a specific branch',
            doctor: {
              id: doctor._id,
              name: doctor.name
            },
            clinic: {
              id: selectedClinic.clinicId,
              name: selectedClinic.name,
              type: 'multi-branch'
            },
            availableBranches: [selectedClinic, ...otherBranches].map(b => ({
              clinicId: b.clinicId,
              name: b.name,
              address: b.address,
              type: b.type
            }))
          });
        }
        selectionType = 'manual';
        message = 'Branch selected';
      }
    }
    // Logic 3: If doctor has multiple clinics, return options
    else {
      return res.json({
        success: true,
        selectionType: 'clinic-selection-required',
        message: 'Please select a clinic',
        doctor: {
          id: doctor._id,
          name: doctor.name,
          specialization: doctor.specialization
        },
        clinicOptions: {
          individualClinics: individualClinics,
          branchClinics: branchClinics,
          totalOptions: individualClinics.length + branchClinics.length
        },
        selectionGuide: {
          individual: 'Will be auto-selected',
          branch: 'Requires branch selection'
        }
      });
    }
    
    // Final selection response
    const response = {
      success: true,
      selection: {
        doctor: {
          id: doctor._id,
          name: doctor.name,
          specialization: doctor.specialization,
          consultationFee: doctor.consultationFee
        },
        clinic: selectedClinic ? {
          id: selectedClinic.clinicId,
          name: selectedClinic.name,
          type: selectedClinic.type,
          address: selectedClinic.address,
          contact: selectedClinic.contact
        } : null,
        selectionType: selectionType,
        message: message,
        timestamp: new Date().toISOString(),
        nextStep: selectionType === 'auto' 
          ? 'proceed-to-appointment'
          : 'confirm-appointment-details'
      }
    };
    
    res.json(response);
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// POST /api/clinics/seed-doctors - Add sample doctors data
router.post('/seed-doctors', async (req, res) => {
  try {
    await connectDB();
    await Doctor.deleteMany({});
    
    const sampleDoctors = [
      {
        name: "Dr. Rajesh Sharma",
        specialization: "Cardiologist",
        qualification: "MD, DM Cardiology",
        experience: 15,
        consultationFee: 1500,
        availableSlots: [
          { day: "Monday", startTime: "10:00", endTime: "14:00" },
          { day: "Wednesday", startTime: "14:00", endTime: "18:00" }
        ],
        clinicType: "individual",
        clinics: [
          {
            clinicId: "heart_clinic_001",
            name: "City Heart Care Center",
            type: "individual",
            address: {
              street: "123 Cardiac Street",
              city: "Delhi",
              state: "Delhi",
              pincode: "110001"
            },
            contact: {
              phone: "011-12345678",
              email: "heartcare@cityclinic.com"
            },
            isPrimary: true
          }
        ],
        rating: 4.8,
        reviews: [
          { patientName: "Ramesh Kumar", rating: 5, comment: "Excellent treatment" }
        ]
      },
      {
        name: "Dr. Priya Singh",
        specialization: "Pediatrician",
        qualification: "MD Pediatrics",
        experience: 10,
        consultationFee: 1000,
        availableSlots: [
          { day: "Tuesday", startTime: "09:00", endTime: "13:00" },
          { day: "Friday", startTime: "15:00", endTime: "19:00" }
        ],
        clinicType: "multi-branch",
        clinics: [
          {
            clinicId: "childcare_main",
            name: "Kids Health Hospital - Main Branch",
            type: "branch",
            address: {
              street: "456 Children Avenue",
              city: "Delhi",
              state: "Delhi",
              pincode: "110017"
            },
            contact: {
              phone: "011-87654321",
              email: "delhi@kidshealth.com"
            },
            isPrimary: true
          },
          {
            clinicId: "childcare_noida",
            name: "Kids Health Hospital - Noida Branch",
            type: "branch",
            address: {
              street: "789 Child Care Road",
              city: "Noida",
              state: "UP",
              pincode: "201301"
            },
            contact: {
              phone: "0120-9876543",
              email: "noida@kidshealth.com"
            },
            isPrimary: false
          }
        ],
        rating: 4.6
      },
      {
        name: "Dr. Amit Verma",
        specialization: "Orthopedic",
        qualification: "MS Orthopedics",
        experience: 12,
        consultationFee: 1200,
        availableSlots: [
          { day: "Monday", startTime: "14:00", endTime: "18:00" },
          { day: "Thursday", startTime: "10:00", endTime: "14:00" }
        ],
        clinicType: "both",
        clinics: [
          {
            clinicId: "bone_clinic_001",
            name: "Bone & Joint Care Clinic",
            type: "individual",
            address: {
              street: "321 Ortho Street",
              city: "Delhi",
              state: "Delhi",
              pincode: "110019"
            },
            contact: {
              phone: "011-55556666",
              email: "info@bonecare.com"
            },
            isPrimary: true
          },
          {
            clinicId: "multicare_gurgaon",
            name: "MultiCare Speciality Hospital",
            type: "branch",
            address: {
              street: "654 Hospital Road, Sector 45",
              city: "Gurgaon",
              state: "Haryana",
              pincode: "122002"
            },
            contact: {
              phone: "0124-33334444",
              email: "gurgaon@multicare.com"
            },
            isPrimary: false
          }
        ],
        rating: 4.7
      },
      {
        name: "Dr. Neha Gupta",
        specialization: "Dermatologist",
        qualification: "MD Dermatology",
        experience: 8,
        consultationFee: 800,
        availableSlots: [
          { day: "Wednesday", startTime: "10:00", endTime: "16:00" },
          { day: "Saturday", startTime: "09:00", endTime: "13:00" }
        ],
        clinicType: "individual",
        clinics: [
          {
            clinicId: "skin_clinic_001",
            name: "Skin & Beauty Clinic",
            type: "individual",
            address: {
              street: "555 Skin Care Avenue",
              city: "Mumbai",
              state: "Maharashtra",
              pincode: "400001"
            },
            contact: {
              phone: "022-22223333",
              email: "contact@skinclinic.com"
            },
            isPrimary: true
          }
        ],
        rating: 4.5
      }
    ];
    
    await Doctor.insertMany(sampleDoctors);
    
    res.json({
      success: true,
      message: "Sample doctors added successfully",
      count: sampleDoctors.length,
      summary: {
        individualClinicDoctors: sampleDoctors.filter(d => d.clinicType === 'individual').length,
        multiBranchDoctors: sampleDoctors.filter(d => d.clinicType === 'multi-branch').length,
        bothTypesDoctors: sampleDoctors.filter(d => d.clinicType === 'both').length,
        totalClinics: sampleDoctors.reduce((sum, doc) => sum + doc.clinics.length, 0)
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ==================== UTILITY ENDPOINTS ====================

// GET /api/clinics/test - Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Clinic API is working with doctor selection features!',
    timestamp: new Date().toISOString(),
    features: {
      clinicSearch: 'active',
      doctorSelection: 'active',
      distanceCalculation: 'active',
      smartClinicLogic: 'active'
    }
  });
});

// POST /api/clinics/test-data - Add test clinic data
router.post('/test-data', async (req, res) => {
  try {
    await connectDB();
    
    const sampleClinics = [
      {
        name: "Max Super Speciality Hospital",
        address: {
          street: "Press Enclave Road",
          area: "Saket",
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
          email: "info@maxhealthcare.com"
        },
        specialties: ["Cardiology", "Neurology", "Orthopedics"],
        rating: 4.5,
        isEmergency: true,
        isActive: true
      }
    ];
    
    await Clinic.deleteMany({});
    await Clinic.insertMany(sampleClinics);
    
    res.json({
      success: true,
      message: 'Added sample clinics',
      clinics: sampleClinics
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

// Distance calculation function - EXISTING
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
