import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let firebaseApp: admin.app.App;

export function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(`../../${process.env.FIREBASE_SERVICE_ACCOUNT_PATH}`);
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      // Handle private key - support both base64 and regular format
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      console.log('Private key format check:', {
        startsWithDashes: privateKey.startsWith('-----'),
        includesBegin: privateKey.includes('BEGIN PRIVATE KEY'),
        length: privateKey.length,
        firstChars: privateKey.substring(0, 50)
      });
      
      // If it looks like base64 (no dashes, no BEGIN), decode it
      if (!privateKey.startsWith('-----') && !privateKey.includes('BEGIN PRIVATE KEY')) {
        try {
          console.log('Attempting to decode base64 private key...');
          privateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
          console.log('Successfully decoded base64 key');
        } catch (e) {
          console.error('Failed to decode base64 private key:', e);
          throw e;
        }
      } else {
        console.log('Private key appears to be in PEM format already');
        // Replace escaped newlines with actual newlines (handle both \n and \\n)
        privateKey = privateKey.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
      }
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    } else {
      console.warn('Firebase credentials not configured. Authentication will not work.');
    }

    console.log('✓ Firebase Admin initialized');
    return firebaseApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

export function getFirebaseAuth() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.auth();
}

export default admin;
