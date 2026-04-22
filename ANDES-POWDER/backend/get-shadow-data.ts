import dotenv from 'dotenv';
import { TuyaContext } from '@tuya/tuya-connector-nodejs';

dotenv.config();

const tuya = new TuyaContext({
  baseUrl: 'https://openapi.tuyaus.com',
  accessKey: 'a8935sx9c9fgvccp8sm5',
  secretKey: '91f200467a2e41449a2631820e8d4562',
});

async function getShadowData() {
  const response = await tuya.request({
    path: '/v2.0/cloud/thing/eb4b7d009bd3f3cd44o3qh/shadow/properties',
    method: 'GET',
  });
  
  console.log('=== SHADOW PROPERTIES (ALL DATA) ===\n');
  console.log(JSON.stringify(response.result, null, 2));
}

getShadowData();
