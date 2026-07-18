import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCQOijISD6usv4lUH7k3ZnGstxiiSbbkyU",
  authDomain: "andes-powder.firebaseapp.com",
  projectId: "andes-powder",
  storageBucket: "andes-powder.firebasestorage.app",
  messagingSenderId: "947154519695",
  appId: "1:947154519695:ios:8560ddb91953b3a6a452fa"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export { auth, analytics };
export default app;
