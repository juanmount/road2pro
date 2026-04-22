import axios from 'axios';
import Constants from 'expo-constants';

// Use localhost for development, production URL for release
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'
  : 'https://road2pro-784570271418.southamerica-west1.run.app/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for development
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
