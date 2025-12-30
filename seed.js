const mongoose = require('mongoose');
const Clinic = require('../models/clinic');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinicDB';

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with real clinic locations...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Clear existing data
    await Clinic.deleteMany({});
    console.log('✅ Cleared existing clinics');
    
    // REAL CLINICS WITH ACTUAL COORDINATES
    const clinics = [
      // DELHI CLINICS
      {
        name: "Max Super Speciality Hospital, Saket",
        address: "Press Enclave Road, Saket, New Delhi",
        city: "delhi",
        phone: "011-26515050",
        specialities: ["Cardiology", "Neurology", "Orthopedics", "Emergency"],
        opening_hours: { open: "09:00", close: "21:00" },
        location: {
          type: "Point",
          coordinates: [77.2000, 28.5245]  // Saket, Delhi
        }
      },
      {
        name: "Apollo Hospitals, Sarita Vihar",
        address: "Mathura Road, Sarita Vihar, New Delhi",
        city: "delhi",
        phone: "011-29871090",
        specialities: ["General Surgery", "Pediatrics", "Gynecology"],
        opening_hours: { open: "08:00", close: "20:00" },
        location: {
          type: "Point",
          coordinates: [77.2923, 28.5314]  // Sarita Vihar
        }
      },
      {
        name: "AIIMS Hospital",
        address: "Ansari Nagar, New Delhi",
        city: "delhi",
        phone: "011-26588500",
        specialities: ["All Specialities", "Research", "Teaching"],
        opening_hours: { open: "00:00", close: "23:59" }, // 24x7
        location: {
          type: "Point",
          coordinates: [77.2100, 28.5675]  // AIIMS
        }
      },
      // MUMBAI CLINICS
      {
        name: "Kokilaben Dhirubhai Ambani Hospital",
        address: "Rao Saheb Achutrao Patwardhan Marg, Four Bunglows, Andheri West",
        city: "mumbai",
        phone: "022-30919000",
        specialities: ["Cardiac Surgery", "Oncology", "Transplant"],
        opening_hours: { open: "08:00", close: "22:00" },
        location: {
          type: "Point",
          coordinates: [72.8721, 19.1185]  // Andheri West
        }
      },
      {
        name: "Lilavati Hospital and Research Centre",
        address: "A-791, Bandra Reclamation, Bandra West",
        city: "mumbai",
        phone: "022-39999999",
        specialities: ["Multispeciality", "ICU", "Surgery"],
        opening_hours: { open: "09:00", close: "21:00" },
        location: {
          type: "Point",
          coordinates: [72.8302, 19.0542]  // Bandra West
        }
      },
      // BANGALORE CLINICS
      {
        name: "Manipal Hospitals, Whitefield",
        address: "Whitefield Main Road, Bangalore",
        city: "bangalore",
        phone: "080-25020000",
        specialities: ["Neurology", "Cardiology", "Orthopedics"],
        opening_hours: { open: "08:30", close: "20:30" },
        location: {
          type: "Point",
          coordinates: [77.7249, 12.9784]  // Whitefield
        }
      },
      // HYDERABAD CLINICS
      {
        name: "Yashoda Hospitals, Somajiguda",
        address: "Raj Bhavan Road, Somajiguda, Hyderabad",
        city: "hyderabad",
        phone: "040-45674567",
        specialities: ["Cancer Care", "Cardiology", "Nephrology"],
        opening_hours: { open: "08:00", close: "22:00" },
        location: {
          type: "Point",
          coordinates: [78.4567, 17.4250]  // Somajiguda
        }
      }
    ];
    
    await Clinic.insertMany(clinics);
    console.log(`✅ Added ${clinics.length} clinics with real coordinates`);
    
    // Create geospatial index
    await Clinic.collection.createIndex({ location: "2dsphere" });
    console.log('✅ Created geospatial index');
    
    // Show summary
    const cityCounts = await Clinic.aggregate([
      { $group: { _id: "$city", count: { $sum: 1 } } }
    ]);
    
    console.log('\n📊 Clinic Distribution:');
    cityCounts.forEach(city => {
      console.log(`  ${city._id}: ${city.count} clinics`);
    });
    
    const total = await Clinic.countDocuments();
    console.log(`\n📈 Total clinics in database: ${total}`);
    
    // Test query example
    console.log('\n🧪 Sample geospatial query:');
    const testClinics = await Clinic.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [77.2090, 28.6139]  // Delhi center
          },
          $maxDistance: 10000  // 10km
        }
      }
    }).limit(3);
    
    console.log(`   Found ${testClinics.length} clinics near Delhi center (10km radius)`);
    
    await mongoose.disconnect();
    console.log('\n🎉 Database seeding completed! Ready for location-based searches.');
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

seedDatabase();
