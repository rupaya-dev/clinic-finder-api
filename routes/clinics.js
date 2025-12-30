const express = require('express');
const router = express.Router();

// GET /api/clinics/nearby/city
router.get('/nearby/city', (req, res) => {
  const { city = 'delhi' } = req.query;
  
  res.json({
    success: true,
    city: city,
    message: `Found clinics near ${city}`,
    clinics: [
      {
        id: 1,
        name: "Max Hospital",
        address: "Saket, Delhi",
        distance: "2.5 km",
        phone: "011-26515050"
      },
      {
        id: 2, 
        name: "Apollo Clinic",
        address: "Sarita Vihar, Delhi",
        distance: "3.8 km",
        phone: "011-29871090"
      }
    ]
  });
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Clinic API is working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
