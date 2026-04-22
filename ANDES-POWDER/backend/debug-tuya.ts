import dotenv from 'dotenv';
import { TuyaContext } from '@tuya/tuya-connector-nodejs';

dotenv.config();

const config = {
  baseUrl: process.env.TUYA_DATA_CENTER || 'https://openapi.tuyaus.com',
  accessKey: process.env.TUYA_ACCESS_ID || '',
  secretKey: process.env.TUYA_ACCESS_SECRET || '',
};

console.log('=== TUYA DEBUG ===\n');
console.log('Config:', {
  baseUrl: config.baseUrl,
  accessKey: config.accessKey,
  secretKey: config.secretKey.substring(0, 8) + '...',
  deviceId: process.env.TUYA_DEVICE_ID
});
console.log('\n');

async function testEndpoints() {
  const endpoints = [
    'https://openapi.tuyaus.com',
    'https://openapi-ueaz.tuyaus.com',
    'https://openapi.tuyacn.com',
    'https://openapi.tuyaeu.com',
    'https://openapi.tuyain.com',
  ];

  for (const endpoint of endpoints) {
    console.log(`\nTesting endpoint: ${endpoint}`);
    try {
      const tuya = new TuyaContext({
        baseUrl: endpoint,
        accessKey: config.accessKey,
        secretKey: config.secretKey,
      });

      const response = await tuya.request({
        path: '/v1.0/token?grant_type=1',
        method: 'GET',
      });

      if (response.success) {
        console.log(`✅ SUCCESS with ${endpoint}`);
        console.log('Token obtained:', response.result.access_token.substring(0, 20) + '...');
        
        // Try to get device info
        const deviceId = process.env.TUYA_DEVICE_ID;
        const deviceResponse = await tuya.request({
          path: `/v1.0/devices/${deviceId}/status`,
          method: 'GET',
        });
        
        if (deviceResponse.success) {
          console.log('✅ Device status retrieved successfully!');
          console.log('Device data:', JSON.stringify(deviceResponse.result, null, 2));
        }
        
        return endpoint;
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n❌ All endpoints failed');
  return null;
}

testEndpoints();
