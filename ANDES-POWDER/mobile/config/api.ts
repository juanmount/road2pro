import axios from 'axios';
import Constants from 'expo-constants';

// TEMPORARY: Force production for testing
const FORCE_PRODUCTION = false;

// Use localhost for development, production URL for release
const API_BASE_URL = (FORCE_PRODUCTION || !__DEV__)
  ? 'https://road2pro-production.up.railway.app/api'
  : 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for development
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
