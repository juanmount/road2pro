import dotenv from 'dotenv';
import { TuyaContext } from '@tuya/tuya-connector-nodejs';

dotenv.config();

const tuya = new TuyaContext({
  baseUrl: process.env.TUYA_DATA_CENTER || 'https://openapi.tuyaus.com',
  accessKey: process.env.TUYA_ACCESS_ID || '',
  secretKey: process.env.TUYA_ACCESS_SECRET || '',
});

async function debugAllCodes() {
  console.log('=== TUYA DEVICE STATUS - ALL CODES ===\n');
  
  try {
    const deviceId = process.env.TUYA_DEVICE_ID;
    const response = await tuya.request({
      path: `/v1.0/devices/${deviceId}/status`,
      method: 'GET',
    });

    if (response.success) {
      console.log('✅ Device status retrieved successfully!\n');
      console.log('Raw response:');
      console.log(JSON.stringify(response.result, null, 2));
      
      console.log('\n📊 Parsed data points:');
      console.log('========================');
      
      response.result.forEach((item: any) => {
        console.log(`Code: ${item.code}`);
        console.log(`  Value: ${item.value}`);
        console.log(`  Type: ${typeof item.value}`);
        
        // Try to parse common conversions
        if (typeof item.value === 'number') {
          console.log(`  Divided by 10: ${item.value / 10}`);
          console.log(`  Divided by 100: ${item.value / 100}`);
        }
        console.log('---');
      });
      
    } else {
      console.log('❌ Failed:', response.msg);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugAllCodes();
