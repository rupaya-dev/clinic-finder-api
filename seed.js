// routes/seed.js - SIMPLIFIED VERSION
console.log('🌱 Starting clinic data setup...\n');

// Mock data directly
const clinicsData = {
  'delhi': [
    { id: 1, name: "Max Hospital", address: "Saket, Delhi", phone: "011-26515050", distance: "2.5 km" },
    { id: 2, name: "Apollo Clinic", address: "Sarita Vihar, Delhi", phone: "011-29871090", distance: "3.8 km" },
    { id: 6, name: "AIIMS Delhi", address: "Ansari Nagar, Delhi", phone: "011-26588500", distance: "5.2 km" }
  ],
  'mumbai': [
    { id: 3, name: "Kokilaben Hospital", address: "Andheri, Mumbai", phone: "022-30919000", distance: "1.2 km" },
    { id: 4, name: "Lilavati Hospital", address: "Bandra, Mumbai", phone: "022-39999999", distance: "4.5 km" },
    { id: 7, name: "HN Reliance Hospital", address: "Girgaon, Mumbai", phone: "022-30666666", distance: "3.1 km" }
  ],
  'bangalore': [
    { id: 5, name: "Manipal Hospital", address: "Whitefield, Bangalore", phone: "080-25020000", distance: "3.0 km" },
    { id: 8, name: "Fortis Hospital", address: "Bannerghatta Road, Bangalore", phone: "080-66214444", distance: "4.7 km" }
  ],
  'chennai': [
    { id: 9, name: "Apollo Chennai", address: "Greams Road, Chennai", phone: "044-28290200", distance: "2.1 km" },
    { id: 10, name: "MIOT Hospital", address: "Manapakkam, Chennai", phone: "044-42002288", distance: "5.3 km" }
  ]
};

console.log('📋 Available cities and clinics count:');
Object.keys(clinicsData).forEach(city => {
  console.log(`  ${city.toUpperCase()}: ${clinicsData[city].length} clinics`);
});

console.log('\n✅ Clinic data ready!');
console.log('\n📝 Now update your routes/clinics.js with this data.');
console.log('\nTo test API:');
console.log('1. node server.js');
console.log('2. Visit: http://localhost:10000/api/clinics?city=mumbai');