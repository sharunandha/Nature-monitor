const apiService = require('../services/apiService');
const { damLocations } = require('../utils/damLocations');

/**
 * Data Controller — all endpoints return 100% live data.
 */
class DataController {

  async getRainfallData(req, res, next) {
    try {
      const { latitude, longitude } = req.query;
      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'latitude and longitude are required' });
      }

      const [forecast, historical, nasa] = await Promise.all([
        apiService.fetchRainfallForecast(+latitude, +longitude),
        apiService.fetchHistoricalRainfall(+latitude, +longitude, 7),
        apiService.fetchNASAPrecipitation(+latitude, +longitude, 14),
      ]);

      res.json({
        forecast,
        historical,
        nasa,
        dataSources: ['Open-Meteo Forecast', 'Open-Meteo Historical', 'NASA POWER Satellite'],
        timestamp: new Date().toISOString(),
      });
    } catch (error) { next(error); }
  }

  async getEarthquakeData(req, res, next) {
    try {
      const { latitude = 20.5937, longitude = 78.9629, radius = 500 } = req.query;
      const data = await apiService.fetchEarthquakeData(+latitude, +longitude, +radius);
      res.json(data);
    } catch (error) { next(error); }
  }

  async getReservoirLevels(req, res, next) {
    try {
      const reservoirs = await apiService.fetchReservoirLevels(damLocations);
      res.json({
        dams: reservoirs,
        timestamp: new Date().toISOString(),
        total: reservoirs.length,
        note: 'Reservoir levels derived from live rainfall + river discharge data (Open-Meteo + GloFAS)',
      });
    } catch (error) { next(error); }
  }

  async getDamLocations(req, res, next) {
    try {
      res.json({
        dams: damLocations,
        timestamp: new Date().toISOString(),
        total: damLocations.length,
      });
    } catch (error) { next(error); }
  }

  async getSoilMoisture(req, res, next) {
    try {
      const { latitude, longitude } = req.query;
      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'latitude and longitude are required' });
      }
      const data = await apiService.fetchSoilMoisture(+latitude, +longitude);
      res.json(data);
    } catch (error) { next(error); }
  }

  async getRiverDischarge(req, res, next) {
    try {
      const { latitude, longitude } = req.query;
      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'latitude and longitude are required' });
      }
      const data = await apiService.fetchRiverDischarge(+latitude, +longitude);
      res.json(data);
    } catch (error) { next(error); }
  }

  async getLiveWeatherData(req, res, next) {
    try {
      const { latitude, longitude } = req.query;
      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'latitude and longitude are required' });
      }

      const data = await apiService.fetchLiveWeather(+latitude, +longitude);
      res.json(data);
    } catch (error) { next(error); }
  }

  async getAllEnvironmentalData(req, res, next) {
    try {
      const { latitude = 20.5937, longitude = 78.9629 } = req.query;

      const [rainfall, earthquakes, reservoirs, soil, flood, nasa] = await Promise.all([
        apiService.fetchRainfallForecast(+latitude, +longitude),
        apiService.fetchEarthquakeData(+latitude, +longitude, 500),
        apiService.fetchReservoirLevels(damLocations),
        apiService.fetchSoilMoisture(+latitude, +longitude),
        apiService.fetchRiverDischarge(+latitude, +longitude),
        apiService.fetchNASAPrecipitation(+latitude, +longitude, 14),
      ]);

      res.json({
        rainfall,
        earthquakes,
        reservoirs,
        soil,
        riverDischarge: flood,
        nasaSatellite: nasa,
        dams: damLocations,
        dataSources: [
          'Open-Meteo Weather Forecast',
          'Open-Meteo Land-Surface Model',
          'Open-Meteo GloFAS Flood API',
          'NASA POWER Satellite',
          'USGS Earthquake Hazards Program',
        ],
        timestamp: new Date().toISOString(),
      });
    } catch (error) { next(error); }
  }

  async getAdvancedRiskAnalysis(req, res, next) {
    try {
      const riskService = require('../services/riskAnalysisService');
      const { damId } = req.query;

      if (!damId) {
        return res.status(400).json({ error: 'damId parameter is required' });
      }

      // Find the dam
      const dam = damLocations.find(d => d.id === damId);
      if (!dam) {
        return res.status(404).json({ error: 'Dam not found' });
      }

      // Get historical data for the dam
      const historicalData = await apiService.fetchAllDataForDam(dam);

      // Calculate advanced risk
      const advancedRisk = await riskService.calculateAdvancedRisk(dam, historicalData);

      res.json({
        ...advancedRisk,
        dataSources: [
          'WeatherAPI (detailed weather)',
          'USGS Water Services (real-time water data)',
          'Sentinel Hub (satellite imagery)',
          'NewsAPI (disaster news)',
          'Open-Meteo (forecast/historical)',
          'NASA POWER (satellite precipitation)',
          'USGS Earthquake (seismic data)'
        ],
        methodology: 'Multi-source weighted analysis with ML-like prediction algorithms',
        timestamp: new Date().toISOString(),
      });
    } catch (error) { next(error); }
  }
}

module.exports = new DataController();
