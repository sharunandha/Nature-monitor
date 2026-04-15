const apiService = require('../services/apiService');
const { damLocations } = require('../utils/damLocations');

/**
 * Data Controller — all endpoints return 100% live data.
 */
class DataController {

  _normalizeState(value = '') {
    return decodeURIComponent(String(value)).trim().toLowerCase();
  }

  _filterDamsByState(stateName) {
    const needle = this._normalizeState(stateName);
    return damLocations.filter(d => this._normalizeState(d.state) === needle);
  }

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
      const sourceSet = new Set(reservoirs.map(d => d.reservoir?.dataSource || d.dataSource).filter(Boolean));
      res.json({
        dams: reservoirs,
        timestamp: new Date().toISOString(),
        total: reservoirs.length,
        dataSource: sourceSet.size === 1 ? [...sourceSet][0] : 'MIXED',
      });
    } catch (error) { next(error); }
  }

  async getReservoirLevelByDam(req, res, next) {
    try {
      const { damId } = req.params;
      const dam = damLocations.find(d => d.id === damId);
      if (!dam) {
        return res.status(404).json({ error: 'Dam not found' });
      }

      const [reservoirDam] = await apiService.fetchReservoirLevels([dam]);
      const history = await apiService.fetchReservoirHistory(dam, 7);

      return res.json({
        dam: reservoirDam,
        history,
        timestamp: new Date().toISOString(),
      });
    } catch (error) { next(error); }
  }

  async getReservoirLevelsByState(req, res, next) {
    try {
      const dams = this._filterDamsByState(req.params.stateName);
      if (!dams.length) {
        return res.status(404).json({ error: 'No dams found for state' });
      }

      const withReservoir = await apiService.fetchReservoirLevels(dams);
      const percentList = withReservoir.map(d => Number(d.reservoir?.percentageFull || 0));
      const avgFill = percentList.length ? percentList.reduce((a, b) => a + b, 0) / percentList.length : 0;
      const criticalCount = withReservoir.filter(d => d.reservoir?.status === 'CRITICAL_HIGH').length;
      const lowCount = withReservoir.filter(d => d.reservoir?.status === 'LOW' || d.reservoir?.status === 'CRITICAL_LOW').length;
      const lastYearAvg = withReservoir.length
        ? withReservoir.reduce((sum, d) => sum + Number(d.reservoir?.lastYearPercentage || 0), 0) / withReservoir.length
        : 0;
      const tenYearAvg = withReservoir.length
        ? withReservoir.reduce((sum, d) => sum + Number(d.reservoir?.tenYearAveragePercent || 0), 0) / withReservoir.length
        : 0;

      return res.json({
        state: dams[0].state,
        dams: withReservoir,
        summary: {
          avgFill: +avgFill.toFixed(1),
          criticalCount,
          lowCount,
          avgLastYear: +lastYearAvg.toFixed(1),
          avgTenYear: +tenYearAvg.toFixed(1),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) { next(error); }
  }

  async getDamsByState(req, res, next) {
    try {
      const dams = this._filterDamsByState(req.params.stateName);
      return res.json({
        state: decodeURIComponent(req.params.stateName),
        dams,
        total: dams.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) { next(error); }
  }

  async getStates(req, res, next) {
    try {
      const allWithReservoir = await apiService.fetchReservoirLevels(damLocations);
      const grouped = allWithReservoir.reduce((acc, dam) => {
        if (!acc[dam.state]) acc[dam.state] = [];
        acc[dam.state].push(dam);
        return acc;
      }, {});

      const states = await Promise.all(Object.keys(grouped).sort().map(async (stateName) => {
        const damsWithReservoir = grouped[stateName];
        const avgFillPercent = damsWithReservoir.length
          ? damsWithReservoir.reduce((sum, d) => sum + Number(d.reservoir?.percentageFull || 0), 0) / damsWithReservoir.length
          : 0;

        const avgLastYear = damsWithReservoir.length
          ? damsWithReservoir.reduce((sum, d) => sum + Number(d.reservoir?.lastYearPercentage || 0), 0) / damsWithReservoir.length
          : 0;

        const avgTenYear = damsWithReservoir.length
          ? damsWithReservoir.reduce((sum, d) => sum + Number(d.reservoir?.tenYearAveragePercent || 0), 0) / damsWithReservoir.length
          : 0;

        return {
          name: stateName,
          damCount: grouped[stateName].length,
          avgFillPercent: +avgFillPercent.toFixed(1),
          avgLastYearPercent: +avgLastYear.toFixed(1),
          avgTenYearPercent: +avgTenYear.toFixed(1),
        };
      }));

      return res.json({ states, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getDamLocations(req, res, next) {
    try {
      const cacheKey = 'dams-all';
      const cached = require('../utils/cache').get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const payload = {
        dams: damLocations,
        timestamp: new Date().toISOString(),
        total: damLocations.length,
      };

      require('../utils/cache').set(cacheKey, payload);
      res.json({
        ...payload,
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
