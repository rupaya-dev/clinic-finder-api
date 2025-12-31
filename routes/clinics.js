// GET /api/clinics/specialists - Get doctors by specialization
router.get('/specialists', async (req, res) => {
  try {
    await connectDB();
    
    const { city, specialization, type } = req.query;
    
    // Get all clinics first
    let query = {};
    
    if (city) {
      const cityLower = city.toLowerCase();
      // We'll filter manually after getting data
    }
    
    const allClinics = await Clinic.find(query).lean();
    
    // Filter by city if provided
    let filteredClinics = allClinics;
    if (city) {
      const cityLower = city.toLowerCase();
      filteredClinics = allClinics.filter(clinic => {
        const clinicCity = extractCityFromDocument(clinic).toLowerCase();
        return clinicCity.includes(cityLower);
      });
    }
    
    // Categorize specialists
    const specialistsData = categorizeSpecialists(filteredClinics, specialization, type);
    
    res.json({
      success: true,
      totalClinics: filteredClinics.length,
      filters: {
        city: city || 'all',
        specialization: specialization || 'all',
        type: type || 'all'
      },
      ...specialistsData
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

// GET /api/clinics/specialists/individual - Only individual specialists
router.get('/specialists/individual', async (req, res) => {
  try {
    await connectDB();
    
    const { city } = req.query;
    
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
    
    // Get individual specialists
    const individualSpecialists = getIndividualSpecialists(filteredClinics);
    
    res.json({
      success: true,
      type: 'individual',
      count: individualSpecialists.length,
      city: city || 'all',
      specialists: individualSpecialists
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/clinics/specialists/multi - Only multi-specialists
router.get('/specialists/multi', async (req, res) => {
  try {
    await connectDB();
    
    const { city } = req.query;
    
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
    
    // Get multi-specialists
    const multiSpecialists = getMultiSpecialists(filteredClinics);
    
    res.json({
      success: true,
      type: 'multi',
      count: multiSpecialists.length,
      city: city || 'all',
      specialists: multiSpecialists
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/clinics/specialists/by-specialization - Group by specialization
router.get('/specialists/by-specialization', async (req, res) => {
  try {
    await connectDB();
    
    const { city } = req.query;
    
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
    
    // Group by specialization
    const bySpecialization = groupBySpecialization(filteredClinics);
    
    res.json({
      success: true,
      totalClinics: filteredClinics.length,
      city: city || 'all',
      specializations: bySpecialization
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

// Categorize specialists into individual and multi
function categorizeSpecialists(clinics, specializationFilter, typeFilter) {
  const individual = [];
  const multi = [];
  
  clinics.forEach(clinic => {
    const specialities = clinic.specialities || [];
    const extractedCity = extractCityFromDocument(clinic);
    
    // Check if clinic matches specialization filter
    let matchesSpecialization = true;
    if (specializationFilter) {
      const specLower = specializationFilter.toLowerCase();
      matchesSpecialization = specialities.some(spec => 
        spec.toLowerCase().includes(specLower)
      );
    }
    
    if (!matchesSpecialization) return;
    
    const specialistData = {
      id: clinic._id,
      name: clinic.name,
      city: extractedCity,
      address: clinic.address,
      phone: clinic.phone,
      specialities: specialities,
      specializationCount: specialities.length,
      rating: clinic.rating || 0,
      isEmergency: clinic.isEmergency || false,
      coordinates: clinic.location?.coordinates || null
    };
    
    // Categorize based on number of specialities
    if (specialities.length === 1) {
      individual.push({
        ...specialistData,
        type: 'individual',
        specialization: specialities[0]
      });
    } else if (specialities.length > 1) {
      multi.push({
        ...specialistData,
        type: 'multi',
        primarySpecialization: specialities[0],
        otherSpecializations: specialities.slice(1)
      });
    }
  });
  
  // Apply type filter if specified
  let filteredIndividual = individual;
  let filteredMulti = multi;
  
  if (typeFilter === 'individual') {
    filteredMulti = [];
  } else if (typeFilter === 'multi') {
    filteredIndividual = [];
  }
  
  return {
    individualSpecialists: {
      count: filteredIndividual.length,
      specialists: filteredIndividual
    },
    multiSpecialists: {
      count: filteredMulti.length,
      specialists: filteredMulti
    },
    summary: {
      total: filteredIndividual.length + filteredMulti.length,
      individualPercentage: Math.round((filteredIndividual.length / clinics.length) * 100) || 0,
      multiPercentage: Math.round((filteredMulti.length / clinics.length) * 100) || 0
    }
  };
}

// Get only individual specialists
function getIndividualSpecialists(clinics) {
  return clinics
    .filter(clinic => {
      const specialities = clinic.specialities || [];
      return specialities.length === 1;
    })
    .map(clinic => {
      const specialities = clinic.specialities || [];
      const extractedCity = extractCityFromDocument(clinic);
      
      return {
        id: clinic._id,
        name: clinic.name,
        city: extractedCity,
        address: clinic.address,
        phone: clinic.phone,
        specialization: specialities[0] || 'General',
        type: 'individual',
        rating: clinic.rating || 0,
        isEmergency: clinic.isEmergency || false
      };
    });
}

// Get only multi-specialists
function getMultiSpecialists(clinics) {
  return clinics
    .filter(clinic => {
      const specialities = clinic.specialities || [];
      return specialities.length > 1;
    })
    .map(clinic => {
      const specialities = clinic.specialities || [];
      const extractedCity = extractCityFromDocument(clinic);
      
      return {
        id: clinic._id,
        name: clinic.name,
        city: extractedCity,
        address: clinic.address,
        phone: clinic.phone,
        specialities: specialities,
        specializationCount: specialities.length,
        primarySpecialization: specialities[0] || 'General',
        otherSpecializations: specialities.slice(1),
        type: 'multi',
        rating: clinic.rating || 0,
        isEmergency: clinic.isEmergency || false
      };
    });
}

// Group clinics by specialization
function groupBySpecialization(clinics) {
  const specializationMap = {};
  
  clinics.forEach(clinic => {
    const specialities = clinic.specialities || [];
    const extractedCity = extractCityFromDocument(clinic);
    
    specialities.forEach(specialization => {
      if (!specializationMap[specialization]) {
        specializationMap[specialization] = {
          specialization: specialization,
          count: 0,
          clinics: [],
          cities: new Set()
        };
      }
      
      specializationMap[specialization].count++;
      specializationMap[specialization].cities.add(extractedCity);
      
      specializationMap[specialization].clinics.push({
        id: clinic._id,
        name: clinic.name,
        city: extractedCity,
        phone: clinic.phone,
        allSpecialities: specialities,
        isIndividual: specialities.length === 1,
        isMulti: specialities.length > 1
      });
    });
  });
  
  // Convert to array and sort by count
  return Object.values(specializationMap)
    .map(item => ({
      ...item,
      cities: Array.from(item.cities),
      individualCount: item.clinics.filter(c => c.isIndividual).length,
      multiCount: item.clinics.filter(c => c.isMulti).length
    }))
    .sort((a, b) => b.count - a.count);
}

// POST /api/clinics/add-specialist-type - Add specialist type field to clinics
router.post('/add-specialist-type', async (req, res) => {
  try {
    await connectDB();
    
    const allClinics = await Clinic.find({}).lean();
    let updatedCount = 0;
    
    for (const clinic of allClinics) {
      const specialities = clinic.specialities || [];
      const specialistType = specialities.length === 1 ? 'individual' : 
                            specialities.length > 1 ? 'multi' : 'unknown';
      
      // Add specialistType field
      await Clinic.updateOne(
        { _id: clinic._id },
        { 
          $set: { 
            specialistType: specialistType,
            specializationCount: specialities.length
          } 
        }
      );
      updatedCount++;
    }
    
    // Get counts
    const individualCount = await Clinic.countDocuments({ specialistType: 'individual' });
    const multiCount = await Clinic.countDocuments({ specialistType: 'multi' });
    
    res.json({
      success: true,
      updated: updatedCount,
      summary: {
        individual: individualCount,
        multi: multiCount,
        unknown: updatedCount - individualCount - multiCount
      },
      message: `Added specialist type to ${updatedCount} clinics`
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
