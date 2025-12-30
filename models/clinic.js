const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true,
    index: true
  },
  phone: {
    type: String,
    required: true
  },
  specialities: [String],  // e.g., ["Cardiology", "Orthopedics"]
  opening_hours: {
    open: String,  // "09:00"
    close: String  // "21:00"
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 &&
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates'
      }
    }
  }
}, {
  timestamps: true  // createdAt, updatedAt automatically
});

// Geospatial index for location-based queries
clinicSchema.index({ location: '2dsphere' });
// Compound index for city + location queries
clinicSchema.index({ city: 1, location: '2dsphere' });

module.exports = mongoose.model('Clinic', clinicSchema);

