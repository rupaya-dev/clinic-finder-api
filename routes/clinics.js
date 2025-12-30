// routes/clinics.js - FINAL WORKING VERSION
const express = require('express');
const router = express.Router();

// REAL DATA - Different for each city
const clinicsDatabase = {
  'delhi': [
    { id: 1, name: "Max Hospital", address: "Saket, Delhi", distance: "2.5 km", phone: "011-26515050" },
    { id: 2, name: "Apollo Clinic", address: "Sarita Vihar, Delhi", distance: "3.8 km", phone: "011-29871090" },
    { id: 6, name: "AIIMS Delhi", address: "Ansari Nagar, Delhi", distance: "5.2 km", phone: "011-26588500" }
  ],
  'mumbai': [
    { id: 3, name: "Kokilaben Hospital", address: "Andheri, Mumbai", distance: "1.2 km", phone: "022-30919000" },
    { id: 4, name: "Lilavati Hospital", address: "Bandra, Mumbai", distance: "4.5 km", phone: "022-39999999" },
    { id: 7, name: "HN Reliance Hospital", address: "Girgaon, Mumbai", distance: "3.1 km", phone: "022-30666666" }
  ],
  'bangalore': [
    { id: 5, name: "Manipal Hospital", address: "Whitefield, Bangalore", distance: "3.0 km", phone: "080-25020000" },
    { id: 8, name: "Fortis Hospital", address: "Bannerghatta Road, Bangalore", distance: "4.7 km", phone: "080-66214444" }
  ],
  'chennai': [
    { id: 9, name: "Apollo Chennai", address: "Greams Road, Chennai", distance: "2.1 km", phone: "044-28290200" },
    { id: 10, name: "MIOT Hospital", address: "Manapakkam, Chennai", distance: "5.3 km", phone: "044-42002288" }
  ],
  'kolkata': [
    { id: 11, name: "AMRI Hospital", address: "Salt Lake, Kolkata", distance: "3.4 km", phone: "033-66800000" },
    { id: 12, name: "Fortis Kolkata", address: "Anandapur, Kolkata", distance: "6.1 km", phone: "033-66284444" }
  ],
  'hyderabad': [
    { id: 13, name: "Yashoda Hospital", address: "Somajiguda, Hyderabad", distance: "2.8 km", phone: "040-45674567" },
    { id: 14, name: "Apollo Hyderabad", address: "Jubilee Hills, Hyderabad", distance: "4.3 km", phone: "040-23607777" }
  ]
};

// GET /api/clinics?city=mumbai
router.get('/', (req, res) => {
  try {
    const city = req.query.city ? req.query.city.toLowerCase().trim() : 'delhi';
    
    console.log(`[API] Request for clinics in: "${city}"`);
    
    if (clinicsDatabase[city]) {
      return res.json({
        success: true,
        city: city,
        message: `Found ${clinicsDatabase[city].length} clinics in ${city}`,
        clinics: clinicsDatabase[city]
      });
    } else {
      // अगर city नहीं मिली, तो available cities suggest करें
      const availableCities = Object.keys(clinicsDatabase).join(', ');
      return res.status(404).json({
        success: false,
        city: city,
        message: `No clinics found for "${city}". Available cities: ${availableCities}`,
        clinics: [],
        available_cities: Object.keys(clinicsDatabase)
      });
    }
  } catch (error) {
    console.error('[API Error]', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
