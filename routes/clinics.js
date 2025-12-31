// GET /api/clinics/specialists - Get doctors/specialists by city and specialty
router.get('/specialists', async (req, res) => {
  try {
    await connectDB();
    
    const { city, specialty, clinicType } = req.query;
    
    // Get all clinics in the city
    let query = {};
    
    if (city) {
      const cityLower = city.toLowerCase();
      // We'll filter in code since we have extractCityFromDocument function
    }
    
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
    
    // Extract specialists from clinics
    const specialists = [];
    
    filteredClinics.forEach(clinic => {
      const clinicCity = extractCityFromDocument(clinic);
      
      // If clinic has specialities array
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
            hasLocation: !!clinic.location,
            // Simulate doctor names based on specialty and clinic
            availableDoctors: generateDoctorsForSpecialty(specialtyName, clinic.name, clinicType)
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
    
    const { city, specialty, experience } = req.query;
    
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
          
          // Filter by experience if provided
          let filteredDoctors = doctors;
          if (experience) {
            const exp = parseInt(experience);
            filteredDoctors = doctors.filter(d => d.experience >= exp);
          }
          
          if (filteredDoctors.length > 0) {
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
              totalDoctors: filteredDoctors.length,
              doctors: filteredDoctors,
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

// Helper function to generate doctors for a specialty
function generateDoctorsForSpecialty(specialty, clinicName, clinicType) {
  const doctors = [];
  
  // Common doctor names by specialty
  const doctorTemplates = {
    'Cardiology': ['Dr. Sharma', 'Dr. Verma', 'Dr. Reddy', 'Dr. Kapoor'],
    'Neurology': ['Dr. Patel', 'Dr. Kumar', 'Dr. Joshi', 'Dr. Nair'],
    'Orthopedics': ['Dr. Singh', 'Dr. Gupta', 'Dr. Malhotra', 'Dr. Choudhary'],
    'Pediatrics': ['Dr. Desai', 'Dr. Iyer', 'Dr. Mehta', 'Dr. Rao'],
    'Dermatology': ['Dr. Khan', 'Dr. Agarwal', 'Dr. Bose', 'Dr. Chatterjee'],
    'General Medicine': ['Dr. Tiwari', 'Dr. Mishra', 'Dr. Saxena', 'Dr. Dubey'],
    'Surgery': ['Dr. Yadav', 'Dr. Pandey', 'Dr. Tripathi', 'Dr. Jha'],
    'Emergency': ['Dr. Basu', 'Dr. Sen', 'Dr. Ghosh', 'Dr. Roy'],
    'ICU': ['Dr. Das', 'Dr. Banerjee', 'Dr. Mukherjee', 'Dr. Dutta']
  };
  
  // Find matching specialty
  let matchedSpecialty = 'General Medicine';
  for (const [key, names] of Object.entries(doctorTemplates)) {
    if (specialty.toLowerCase().includes(key.toLowerCase())) {
      matchedSpecialty = key;
      break;
    }
  }
  
  const doctorNames = doctorTemplates[matchedSpecialty] || doctorTemplates['General Medicine'];
  
  // Number of doctors based on clinic type
  let doctorCount = 1;
  if (clinicType === 'multi-specialty' || clinicName.toLowerCase().includes('hospital')) {
    doctorCount = Math.floor(Math.random() * 3) + 2; // 2-4 doctors
  }
  
  // Generate doctors
  for (let i = 0; i < Math.min(doctorCount, doctorNames.length); i++) {
    doctors.push({
      id: `doc_${specialty.replace(/\s+/g, '_').toLowerCase()}_${i}`,
      name: doctorNames[i],
      specialty: matchedSpecialty,
      experience: Math.floor(Math.random() * 20) + 5, // 5-25 years
      consultationFee: calculateConsultationFee(matchedSpecialty, 4.0),
      available: i % 3 !== 0 // Simulate availability
    });
  }
  
  return doctors;
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
      rating: (Math.random() * 1.5 + 3.5).toFixed(1), // 3.5-5.0
      languages: ['Hindi', 'English', getRegionalLanguage(city)],
      isAcceptingNewPatients: Math.random() > 0.3
    });
  }
  
  return doctors;
}

// Helper functions
function getSubSpecialty(specialty) {
  const subSpecialties = {
    'Cardiology': ['Interventional', 'Non-Invasive', 'Pediatric Cardiology'],
    'Neurology': ['Stroke', 'Epilepsy', 'Movement Disorders'],
    'Orthopedics': ['Joint Replacement', 'Spine', 'Sports Medicine'],
    'Pediatrics': ['Neonatology', 'Pediatric Cardiology', 'Pediatric Neurology']
  };
  return subSpecialties[specialty] ? subSpecialties[specialty][Math.floor(Math.random() * subSpecialties[specialty].length)] : null;
}

function getAvailableDays(doctorIndex) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const start = doctorIndex % days.length;
  return days.slice(start, start + 4);
}

function getConsultationTimings(doctorIndex) {
  const shifts = [
    '10:00 AM - 2:00 PM',
    '2:00 PM - 6:00 PM', 
    '9:00 AM - 1:00 PM',
    '4:00 PM - 8:00 PM'
  ];
  return shifts[doctorIndex % shifts.length];
}

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
    'nagpur': 'Marathi'
  };
  return cityLanguages[city.toLowerCase()] || 'Local Language';
}

function calculateConsultationFee(specialty, experience) {
  const baseFees = {
    'Cardiology': 1500,
    'Neurology': 1400,
    'Orthopedics': 1200,
    'Pediatrics': 800,
    'General Medicine': 700,
    'Surgery': 1600
  };
  
  const baseFee = baseFees[specialty] || 1000;
  const experienceMultiplier = 1 + (experience / 100);
  
  return Math.round(baseFee * experienceMultiplier);
}
