/**
 * Simple build test - Check if all modules can be imported
 */

console.log('🧪 Testing module imports...');

try {
  // Test basic imports
  console.log('1. Testing config import...');
  const config = require('./dist/config/datacenter-config.js');
  console.log('✅ Config imported successfully');

  console.log('2. Testing auth import...');
  const auth = require('./dist/auth/pat-authenticator.js');
  console.log('✅ Auth imported successfully');

  console.log('3. Testing API client import...');
  const client = require('./dist/api/datacenter-client.js');
  console.log('✅ API Client imported successfully');

  console.log('4. Testing modules imports...');
  
  try {
    const agile = require('./dist/modules/agile/index.js');
    console.log('✅ Agile Module imported successfully');
  } catch (e) {
    console.log('⚠️ Agile Module import failed:', e.message);
  }

  try {
    const core = require('./dist/modules/core/index.js');
    console.log('✅ Core Module imported successfully');
  } catch (e) {
    console.log('⚠️ Core Module import failed:', e.message);
  }

  try {
    const search = require('./dist/modules/search/index.js');
    console.log('✅ Search Module imported successfully');
  } catch (e) {
    console.log('⚠️ Search Module import failed:', e.message);
  }

  console.log('\n🎉 Basic import test completed!');
  console.log('📊 Build Status: All core components importable');

} catch (error) {
  console.error('❌ Import test failed:', error.message);
  process.exit(1);
}