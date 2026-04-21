import axios from 'axios';

const API_BASE_URL = 'https://road2pro-production.up.railway.app/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
