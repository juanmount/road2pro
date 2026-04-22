import dotenv from 'dotenv';
import { TuyaContext } from '@tuya/tuya-connector-nodejs';

dotenv.config();

const tuya = new TuyaContext({
  baseUrl: process.env.TUYA_DATA_CENTER || 'https://openapi.tuyaus.com',
  accessKey: process.env.TUYA_ACCESS_ID || '',
  secretKey: process.env.TUYA_ACCESS_SECRET || '',
});

async function debugFullDevice() {
  console.log('=== TUYA DEVICE FULL INFO ===\n');
  
  const deviceId = process.env.TUYA_DEVICE_ID;
  
  try {
    // 1. Get device details
    console.log('1️⃣ Device Details:');
    const detailsResponse = await tuya.request({
      path: `/v1.0/devices/${deviceId}`,
      method: 'GET',
    });
    console.log(JSON.stringify(detailsResponse.result, null, 2));
    
    console.log('\n---\n');
    
    // 2. Get device status
    console.log('2️⃣ Device Status:');
    const statusResponse = await tuya.request({
      path: `/v1.0/devices/${deviceId}/status`,
      method: 'GET',
    });
    console.log(JSON.stringify(statusResponse.result, null, 2));
    
    console.log('\n---\n');
    
    // 3. Get device functions
    console.log('3️⃣ Device Functions:');
    const functionsResponse = await tuya.request({
      path: `/v1.0/devices/${deviceId}/functions`,
      method: 'GET',
    });
    console.log(JSON.stringify(functionsResponse.result, null, 2));
    
    console.log('\n---\n');
    
    // 4. Get device specifications
    console.log('4️⃣ Device Specifications:');
    const specsResponse = await tuya.request({
      path: `/v1.0/devices/${deviceId}/specifications`,
      method: 'GET',
    });
    console.log(JSON.stringify(specsResponse.result, null, 2));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

debugFullDevice();
