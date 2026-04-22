import dotenv from 'dotenv';
import { TuyaContext } from '@tuya/tuya-connector-nodejs';

dotenv.config();

const tuya = new TuyaContext({
  baseUrl: process.env.TUYA_DATA_CENTER || 'https://openapi.tuyaus.com',
  accessKey: process.env.TUYA_ACCESS_ID || '',
  secretKey: process.env.TUYA_ACCESS_SECRET || '',
});

async function tryAllEndpoints() {
  console.log('=== TRYING ALL POSSIBLE ENDPOINTS ===\n');
  
  const deviceId = process.env.TUYA_DEVICE_ID;
  
  const endpoints = [
    { name: 'Device Status', path: `/v1.0/devices/${deviceId}/status` },
    { name: 'Device Details', path: `/v1.0/devices/${deviceId}` },
    { name: 'Device Properties', path: `/v1.0/devices/${deviceId}/properties` },
    { name: 'Device Logs', path: `/v1.0/devices/${deviceId}/logs` },
    { name: 'Device Report', path: `/v1.0/devices/${deviceId}/report` },
    { name: 'Device Shadow', path: `/v1.0/devices/${deviceId}/shadow/properties` },
    { name: 'IoT Device Status', path: `/v1.0/iot-03/devices/${deviceId}/status` },
    { name: 'IoT Device Properties', path: `/v1.0/iot-03/devices/${deviceId}/properties` },
    { name: 'Device Latest Data', path: `/v2.0/cloud/thing/${deviceId}/shadow/properties` },
    { name: 'Device All Properties', path: `/v1.0/iot-03/devices/${deviceId}/report-logs` },
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing: ${endpoint.name}`);
    console.log(`   Path: ${endpoint.path}`);
    
    try {
      const response = await tuya.request({
        path: endpoint.path,
        method: 'GET',
      });
      
      if (response.success && response.result) {
        console.log('   ✅ SUCCESS!');
        console.log('   Data:', JSON.stringify(response.result, null, 2));
      } else {
        console.log(`   ❌ Failed: ${response.msg}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

tryAllEndpoints();
