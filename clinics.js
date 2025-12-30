// models/clinic.js
let mongoose;
try {
  mongoose = require('mongoose');
} catch (error) {
  // अगर mongoose नहीं installed है तो mock बनाएं
  mongoose = {
    Schema: class Schema {
      constructor(obj) {
        this.obj = obj;
      }
    },
    model: function(name, schema) {
      return class MockModel {
        static find() {
          return Promise.resolve([]);
        }
        static deleteMany() {
          return Promise.resolve();
        }
        static insertMany() {
          return Promise.resolve();
        }
      };
    }
  };
  console.log('⚠️ Using mock mongoose (for development)');
}

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
