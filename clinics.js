const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  name: String,
  address: String,
  city: String,
  phone: String,
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  }
});

module.exports = mongoose.model('Clinic', clinicSchema);