const riskAnalysisService = require('../services/riskAnalysisService');
const apiService = require('../services/apiService');
const { damLocations } = require('../utils/damLocations');

/**
 * Risk Controller — every score comes from live API data, zero random values.
 * With 50+ dams we process in parallel batches of 5 to balance speed vs rate limits.
 */

// ── Shared helper: fetch all data + compute risk for one dam ──────
async function computeDamRisk(dam) {
  const [weather, historical, soil, flood, quakes, reservoirs] = await Promise.all([
    apiService.fetchRainfallForecast(dam.latitude, dam.longitude),
    apiService.fetchHistoricalRainfall(dam.latitude, dam.longitude, 7),
    apiService.fetchSoilMoisture(dam.latitude, dam.longitude),
    apiService.fetchRiverDischarge(dam.latitude, dam.longitude),
    apiService.fetchEarthquakeData(dam.latitude, dam.longitude, 300),
    apiService.fetchReservoirLevels([dam]),
  ]);

  const precipForecastArr = weather.daily?.precipitation_sum || [];
  const forecastRainfall = precipForecastArr.length ? Math.max(...precipForecastArr) : 0;
  const histPrecipArr = historical.daily?.precipitation_sum || [];
  const historicalRainfall = histPrecipArr.reduce((s, v) => s + (v || 0), 0);
  const reservoirLevel = reservoirs[0]?.currentLevel || 0;
  const rainfallTrend = reservoirs[0]?.trend || 'stable';
  const riverDischarge = flood.stats?.latestDischarge || 0;
  const soilM = soil.current?.moisture_0_7cm || 0;
  const deepSoilM = soil.current?.moisture_28_100cm || 0;

  const floodRisk = riskAnalysisService.calculateFloodRisk({
    reservoirLevel, forecastRainfall, historicalRainfall, riverDischarge, rainfallTrend,
  });
  const landslideRisk = riskAnalysisService.calculateLandslideRisk({
    soilMoisture: soilM,
    rainfallAccumulation: historicalRainfall,
    earthquakeMagnitude: quakes.maxMagnitude || 0,
    earthquakeCount: quakes.total || 0,
    state: dam.state,
    deepSoilMoisture: deepSoilM,
  });

  return {
    dam, weather, historical, soil, flood, quakes,
    reservoirs, floodRisk, landslideRisk,
    forecastRainfall, historicalRainfall, reservoirLevel,
    rainfallTrend, riverDischarge, soilM, deepSoilM,
  };
}

// ── Process dams in parallel batches ──────────────────────────────
async function processBatched(items, fn, batchSize = 5) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults.filter(Boolean));
  }
  return results;
}

class RiskController {

  /* ── Calculate risk for a single dam ─────────────────────────────── */
  async calculateRisk(req, res, next) {
    try {
      const { damId } = req.body;
      if (!damId) return res.status(400).json({ error: 'damId is required' });

      const dam = damLocations.find(d => d.id === damId);
      if (!dam) return res.status(404).json({ error: 'Dam not found' });

      // Fetch ALL live data in parallel
      const bundle = await apiService.fetchAllDataForDam(dam);
      const { weather, historical, soil, flood, nasa, quakes } = bundle;

      // Extract real values
      const precipForecastArr = weather.daily?.precipitation_sum || [];
      const forecastRainfall = precipForecastArr.length ? Math.max(...precipForecastArr) : 0;

      const histPrecipArr = historical.daily?.precipitation_sum || [];
      const historicalRainfall = histPrecipArr.reduce((s, v) => s + (v || 0), 0);

      const reservoirs = await apiService.fetchReservoirLevels([dam]);
      const reservoirLevel = reservoirs[0]?.currentLevel || 0;
      const rainfallTrend = reservoirs[0]?.trend || 'stable';

      const riverDischarge = flood.stats?.latestDischarge || 0;

      const soilM = soil.current?.moisture_0_7cm || soil.avg24h?.moisture_0_7cm || 0;
      const deepSoilM = soil.current?.moisture_28_100cm || soil.avg24h?.moisture_28_100cm || 0;

      const maxEqMag = quakes.maxMagnitude || 0;
      const eqCount = quakes.total || 0;

      // Compute flood risk
      const floodRisk = riskAnalysisService.calculateFloodRisk({
        reservoirLevel,
        forecastRainfall,
        historicalRainfall,
        riverDischarge,
        rainfallTrend,
      });

      // Compute landslide risk
      const landslideRisk = riskAnalysisService.calculateLandslideRisk({
        soilMoisture: soilM,
        rainfallAccumulation: historicalRainfall,
        earthquakeMagnitude: maxEqMag,
        earthquakeCount: eqCount,
        state: dam.state,
        deepSoilMoisture: deepSoilM,
      });

      // Generate alerts
      const alerts = riskAnalysisService.generateAlerts(floodRisk, landslideRisk, dam.name);

      // 24h prediction (deterministic)
      const predictionFactors = {
        highDischarge: riverDischarge > 500,
        saturatedSoil: soilM > 0.35,
        seismicActivity: eqCount > 0,
        hasWeatherData: !weather.error,
        hasSoilData: !soil.error,
        hasDischargeData: !flood.error,
        hasSeismicData: !quakes.error,
      };

      const floodPrediction = riskAnalysisService.predictRisk24Hours(floodRisk.score, rainfallTrend, predictionFactors);
      const landslidePrediction = riskAnalysisService.predictRisk24Hours(landslideRisk.score, rainfallTrend, predictionFactors);

      // Build historical daily array (past 7 days) for trend chart
      const histDailyPrecip = historical.daily?.precipitation_sum || [];
      const histDailyDates = historical.daily?.time || [];

      res.json({
        dam: {
          id: dam.id,
          name: dam.name,
          state: dam.state,
          river: dam.river,
          capacity: dam.capacity,
          coordinates: { latitude: dam.latitude, longitude: dam.longitude },
        },
        floodRisk: { current: floodRisk, prediction24h: floodPrediction },
        landslideRisk: { current: landslideRisk, prediction24h: landslidePrediction },
        environmentalData: {
          rainfall: {
            forecast: +forecastRainfall.toFixed(1),
            accumulation: +historicalRainfall.toFixed(1),
            nasaAvg: nasa.stats?.avgPrecip || 0,
            dailyHistory: histDailyDates.map((d, i) => ({
              date: d,
              precipitation: histDailyPrecip[i] || 0,
            })),
          },
          earthquakes: {
            recentCount: eqCount,
            maxMagnitude: maxEqMag,
          },
          reservoir: {
            level: reservoirLevel,
            trend: rainfallTrend,
            riverDischarge: riverDischarge,
          },
          soil: {
            surfaceMoisture: soilM,
            deepMoisture: deepSoilM,
          },
        },
        dataSources: [
          weather.source || 'Open-Meteo',
          soil.source || 'Open-Meteo Land-Surface',
          flood.source || 'GloFAS',
          nasa.source || 'NASA POWER',
          quakes.source || 'USGS',
        ],
        alerts,
        timestamp: new Date().toISOString(),
      });
    } catch (error) { next(error); }
  }

  /* ── Risk overview for all dams ──────────────────────────────────── */
  async getAllRisks(req, res, next) {
    try {
      const risks = await processBatched(damLocations, async (dam) => {
        try {
          const r = await computeDamRisk(dam);
          return {
            dam: {
              id: dam.id, name: dam.name, state: dam.state,
              coordinates: { latitude: dam.latitude, longitude: dam.longitude },
            },
            floodRisk: r.floodRisk.level,
            floodScore: r.floodRisk.score,
            landslideRisk: r.landslideRisk.level,
            landslideScore: r.landslideRisk.score,
            overallRisk: Math.max(r.floodRisk.score, r.landslideRisk.score),
            environmentalSummary: {
              forecastRainfall: +r.forecastRainfall.toFixed(1),
              cumRainfall7d: +r.historicalRainfall.toFixed(1),
              reservoirLevel: +r.reservoirLevel.toFixed(1),
              riverDischarge: +r.riverDischarge.toFixed(1),
              soilMoisture: +(r.soilM * 100).toFixed(1),
              earthquakes: r.quakes.total || 0,
            },
          };
        } catch (err) {
          console.error(`Error calculating risk for ${dam.name}:`, err.message);
          return null;
        }
      }, 5);

      res.json({
        risks: risks.sort((a, b) => b.overallRisk - a.overallRisk),
        timestamp: new Date().toISOString(),
        total: risks.length,
        dataSources: ['Open-Meteo', 'GloFAS', 'NASA POWER', 'USGS'],
      });
    } catch (error) { next(error); }
  }

  /* ── Alerts for all dams ─────────────────────────────────────────── */
  async getAlerts(req, res, next) {
    try {
      const { severity = 'all' } = req.query;

      const allAlerts = await processBatched(damLocations, async (dam) => {
        try {
          const r = await computeDamRisk(dam);
          return riskAnalysisService.generateAlerts(r.floodRisk, r.landslideRisk, dam.name);
        } catch (err) {
          console.error(`Error generating alerts for ${dam.name}:`, err.message);
          return [];
        }
      }, 5);

      // Flatten (each dam returns an array of alerts)
      const flat = allAlerts.flat();
      const filtered = severity !== 'all' ? flat.filter(a => a.severity === severity) : flat;

      res.json({
        alerts: filtered.sort((a, b) => (b.score || 0) - (a.score || 0)),
        timestamp: new Date().toISOString(),
        total: filtered.length,
        dataSources: ['Open-Meteo', 'GloFAS', 'NASA POWER', 'USGS'],
      });
    } catch (error) { next(error); }
  }
}

module.exports = new RiskController();
