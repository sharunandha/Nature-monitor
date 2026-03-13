import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 50+ dams × 6 APIs each — first load can take 60-90s
});

// Data APIs — all return live data
export const dataAPI = {
  getRainfallData: (latitude, longitude) =>
    apiClient.get('/data/rainfall', { params: { latitude, longitude } }),
  
  getEarthquakeData: (latitude, longitude, radius) =>
    apiClient.get('/data/earthquakes', { params: { latitude, longitude, radius } }),
  
  getReservoirLevels: () =>
    apiClient.get('/data/reservoirs'),
  
  getDamLocations: () =>
    apiClient.get('/data/dams'),

  getSoilMoisture: (latitude, longitude) =>
    apiClient.get('/data/soil', { params: { latitude, longitude } }),

  getRiverDischarge: (latitude, longitude) =>
    apiClient.get('/data/discharge', { params: { latitude, longitude } }),

  getLiveWeather: (latitude, longitude) =>
    apiClient.get('/data/weather', { params: { latitude, longitude } }),
  
  getAllEnvironmentalData: (latitude, longitude) =>
    apiClient.get('/data/all', { params: { latitude, longitude } }),

  getAdvancedRiskAnalysis: (damId) =>
    apiClient.get('/data/advanced-risk', { params: { damId } }),
};

// Risk APIs — all computed from live data
export const riskAPI = {
  calculateRisk: (damId, state) =>
    apiClient.post('/risk/calculate', { damId, state }),
  
  getAllRisks: () =>
    apiClient.get('/risk/all'),
  
  getAlerts: (severity = 'all') =>
    apiClient.get('/risk/alerts', { params: { severity } }),
};

// Health check
export const checkHealth = () =>
  apiClient.get('/health');

export default apiClient;
