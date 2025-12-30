const express = require('express');
const app = express();

// Routes
const clinicRoutes = require('./routes/clinics');
app.use('/api/clinics', clinicRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'Clinic API is running!',
    endpoints: {
      get_clinics: 'GET /api/clinics?city=cityname',
      available_cities: ['delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'hyderabad']
    }
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Try: http://localhost:${PORT}/api/clinics?city=mumbai`);
});
