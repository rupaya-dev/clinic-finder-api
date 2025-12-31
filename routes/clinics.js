const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Existing city coordinates mapping...
// (आपका existing code यहाँ रहेगा)

// New: Doctor Schema
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
    isPrimary: { type: Boolean, default: false }
  }],
  rating: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
});

const Doctor = mongoose.model('Doctor', doctorSchema);

// Existing GET /api/clinics/nearby/city endpoint...
// (आपका existing code यहाँ रहेगा)

// ✅ NEW: GET /api/clinics/doctors - Find doctors with clinic selection
router.get('/doctors', async (req, res) => {
  try {
    const { city, specialization, clinicType } = req.query;
    
    let query = { isActive: true };
    
    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }
    
    if (clinicType) {
      query['clinics.type'] = clinicType;
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
          clinicType: doctor.clinicType
        },
        selectionLogic: {
          ifIndividualClinic: individualClinics.length > 0 
            ? `Auto-select: ${individualClinics[0].name}` 
            : null,
          ifMultiBranch: branchClinics.length > 0
            ? `Choose from ${branchClinics.length} branches`
            : null,
          autoSelection: individualClinics.length === 1 && branchClinics.length === 0
            ? 'available' 
            : 'not-available'
        }
      };
    });
    
    res.json({
      success: true,
      count: categorizedDoctors.length,
      selectionLogic: {
        individualClinic: 'Auto-selected',
        multiBranch: 'Manual selection required',
        bothTypes: 'Show all options'
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

// ✅ NEW: POST /api/clinics/select-doctor - Select doctor with clinic
router.post('/select-doctor', async (req, res) => {
  try {
    const { doctorId, clinicId, branchId } = req.body;
    
    const doctor = await Doctor.findById(doctorId).lean();
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    // Find the clinic
    let selectedClinic = null;
    let selectionType = '';
    let availableBranches = [];
    
    if (clinicId) {
      // Specific clinic selected
      selectedClinic = doctor.clinics.find(c => c.clinicId === clinicId);
      
      if (!selectedClinic) {
        return res.status(400).json({
          success: false,
          error: 'Doctor not available at this clinic'
        });
      }
      
      if (selectedClinic.type === 'individual') {
        selectionType = 'auto';
      } else if (selectedClinic.type === 'branch') {
        selectionType = 'manual';
        // For branch, we might need branchId
        if (!branchId) {
          return res.status(400).json({
            success: false,
            error: 'Branch selection required',
            selectionType: 'branch-selection-needed'
          });
        }
      }
    } else {
      // Auto-select logic based on doctor's clinic type
      const individualClinics = doctor.clinics.filter(c => c.type === 'individual');
      const branchClinics = doctor.clinics.filter(c => c.type === 'branch');
      
      if (individualClinics.length > 0) {
        // Auto-select individual clinic
        selectedClinic = individualClinics[0];
        selectionType = 'auto';
      } else if (branchClinics.length > 0) {
        // Show branch options
        selectionType = 'choose-branch';
        availableBranches = branchClinics;
        
        return res.json({
          success: true,
          selectionType: 'branch-selection-required',
          message: 'Please select a branch',
          doctor: {
            id: doctor._id,
            name: doctor.name,
            specialization: doctor.specialization
          },
          availableBranches: availableBranches.map(b => ({
            clinicId: b.clinicId,
            name: b.name,
            address: b.address,
            type: b.type
          }))
        });
      }
    }
    
    // Response for successful selection
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
          address: selectedClinic.address
        } : null,
        selectionType: selectionType,
        timestamp: new Date().toISOString(),
        nextStep: selectionType === 'auto' 
          ? 'proceed-to-appointment'
          : 'confirm-branch-selection'
      }
    };
    
    res.json(response);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: POST /api/clinics/seed-doctors - Add sample doctors
router.post('/seed-doctors', async (req, res) => {
  try {
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
            clinicId: "clinic_001",
            name: "City Heart Clinic",
            type: "individual",
            address: {
              street: "123 Cardiac Street",
              city: "Delhi",
              state: "Delhi",
              pincode: "110001"
            },
            isPrimary: true
          }
        ],
        rating: 4.8
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
            clinicId: "clinic_002",
            name: "Child Care Center - South Delhi",
            type: "branch",
            address: {
              street: "456 Kids Avenue",
              city: "Delhi",
              state: "Delhi",
              pincode: "110017"
            },
            isPrimary: true
          },
          {
            clinicId: "clinic_003",
            name: "Child Care Center - Noida",
            type: "branch",
            address: {
              street: "789 Child Street",
              city: "Noida",
              state: "UP",
              pincode: "201301"
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
            clinicId: "clinic_004",
            name: "Bone & Joint Clinic",
            type: "individual",
            address: {
              street: "321 Bone Street",
              city: "Delhi",
              state: "Delhi",
              pincode: "110019"
            },
            isPrimary: true
          },
          {
            clinicId: "clinic_005",
            name: "MultiCare Hospital - Gurgaon",
            type: "branch",
            address: {
              street: "654 Hospital Road",
              city: "Gurgaon",
              state: "Haryana",
              pincode: "122002"
            },
            isPrimary: false
          }
        ],
        rating: 4.7
      }
    ];
    
    await Doctor.insertMany(sampleDoctors);
    
    res.json({
      success: true,
      message: "Sample doctors added successfully",
      count: sampleDoctors.length,
      doctors: sampleDoctors.map(d => ({
        name: d.name,
        specialization: d.specialization,
        clinicType: d.clinicType,
        clinics: d.clinics.length
      }))
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Existing calculateDistance function...
// (आपका existing code यहाँ रहेगा)

module.exports = router;
