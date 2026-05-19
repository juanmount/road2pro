// Script para convertir el private key a base64 para Railway
// Uso: node scripts/encode-private-key.js path/to/service-account.json

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node encode-private-key.js <path-to-service-account.json>');
  process.exit(1);
}

const filePath = args[0];

try {
  const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  console.log('\n=== Firebase Environment Variables for Railway ===\n');
  
  console.log('FIREBASE_PROJECT_ID');
  console.log(serviceAccount.project_id);
  console.log('');
  
  console.log('FIREBASE_CLIENT_EMAIL');
  console.log(serviceAccount.client_email);
  console.log('');
  
  console.log('FIREBASE_PRIVATE_KEY (base64 encoded)');
  const base64Key = Buffer.from(serviceAccount.private_key).toString('base64');
  console.log(base64Key);
  console.log('');
  
  console.log('✓ Copy these values to Railway environment variables');
  
} catch (error) {
  console.error('Error reading service account file:', error.message);
  process.exit(1);
}
