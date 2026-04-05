const riskAnalysisService = require('../services/riskAnalysisService');
const apiService = require('../services/apiService');
const { damLocations } = require('../utils/damLocations');

const SUMMARY_CACHE_TTL_MS = (Number(process.env.SUMMARY_CACHE_SECONDS) || 180) * 1000;
const summaryCache = {
  payload: null,
  timestamp: 0,
  inFlight: null,
};

function hasFreshSummary() {
  return !!summaryCache.payload && (Date.now() - summaryCache.timestamp) < SUMMARY_CACHE_TTL_MS;
}

function buildAlertsFromRisks(risks, severity = 'all') {
  const allAlerts = risks.flatMap((r) => {
    const flood = { level: r.floodRisk, score: r.floodScore, factors: [] };
    const landslide = { level: r.landslideRisk, score: r.landslideScore, factors: [] };
    return riskAnalysisService.generateAlerts(flood, landslide, r.dam?.name || 'Unknown');
  });

  const filtered = severity !== 'all'
    ? allAlerts.filter(a => a.severity === severity)
    : allAlerts;

  return filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
}

async function buildRiskSummary() {
  const risks = await processBatched(damLocations, async (dam) => {
    try {
      const r = await computeDamRisk(dam);
      return {
        dam: {
          id: dam.id,
          name: dam.name,
          state: dam.state,
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
  }, 4);

  const sorted = risks.sort((a, b) => b.overallRisk - a.overallRisk);
  return {
    risks: sorted,
    timestamp: new Date().toISOString(),
    total: sorted.length,
    dataSources: ['Open-Meteo', 'GloFAS', 'NASA POWER', 'USGS'],
  };
}

/**
 * Risk Controller — every score comes from live API data, zero random values.
 * With 50+ dams we process in parallel batches of 5 to balance speed vs rate limits.
 */

// ── Shared helper: fetch all data + compute risk for one dam ──────
async function computeDamRisk(dam, includeSeismic = false) {
  const [weather, historical, soil, flood, quakes] = await Promise.all([
    apiService.fetchRainfallForecast(dam.latitude, dam.longitude),
    apiService.fetchHistoricalRainfall(dam.latitude, dam.longitude, 7),
    apiService.fetchSoilMoisture(dam.latitude, dam.longitude),
    apiService.fetchRiverDischarge(dam.latitude, dam.longitude),
    includeSeismic
      ? apiService.fetchEarthquakeData(dam.latitude, dam.longitude, 300)
      : Promise.resolve({ total: 0, maxMagnitude: 0, source: 'Skipped (aggregate fast mode)' }),
  ]);

  const precipForecastArr = weather.daily?.precipitation_sum || [];
  const forecastRainfall = precipForecastArr.length ? Math.max(...precipForecastArr) : 0;
  const histPrecipArr = historical.daily?.precipitation_sum || [];
  const historicalRainfall = histPrecipArr.reduce((s, v) => s + (v || 0), 0);
  const riverDischarge = flood.stats?.latestDischarge || 0;
  const soilM = soil.current?.moisture_0_7cm || soil.avg24h?.moisture_0_7cm || 0;
  const deepSoilM = soil.current?.moisture_28_100cm || soil.avg24h?.moisture_28_100cm || 0;

  const month = new Date().getMonth();
  const seasonalBase = [
    38, 35, 33, 30, 28, 32,
    45, 58, 70, 75, 65, 50,
  ][month];

  const capFactor = Math.min(dam.capacity / 100, 1);
  const damVariation = (capFactor * 15) - 7;
  const rainAdjust = Math.min(historicalRainfall / 10, 15);
  const dischRatio = Math.min(riverDischarge / Math.max(flood.stats?.maxDischarge || 1, 1), 1);
  const dischAdjust = dischRatio * 12;
  const soilAdjust = Math.min(soilM / 0.4, 1) * 8;
  const avgDischAdjust = Math.min((flood.stats?.avgDischarge || 0) / 100, 1) * 5;

  const reservoirLevel = Math.max(10, Math.min(
    seasonalBase + damVariation + rainAdjust + dischAdjust + soilAdjust + avgDischAdjust,
    98,
  ));

  let rainfallTrend = 'stable';
  if (histPrecipArr.length >= 6) {
    const recent = histPrecipArr.slice(-3).reduce((s, v) => s + (v || 0), 0);
    const earlier = histPrecipArr.slice(0, 3).reduce((s, v) => s + (v || 0), 0);
    if (recent > earlier * 1.3) rainfallTrend = 'increasing';
    else if (recent < earlier * 0.7) rainfallTrend = 'decreasing';
  }

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
    floodRisk, landslideRisk,
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

    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
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

      // Fetch the rate-limited APIs in sequence so one dam does not burst Open-Meteo.
      const weather = await apiService.fetchRainfallForecast(dam.latitude, dam.longitude);
      const historical = await apiService.fetchHistoricalRainfall(dam.latitude, dam.longitude, 7);
      const soil = await apiService.fetchSoilMoisture(dam.latitude, dam.longitude);
      const flood = await apiService.fetchRiverDischarge(dam.latitude, dam.longitude);
      const [nasa, quakes] = await Promise.all([
        apiService.fetchNASAPrecipitation(dam.latitude, dam.longitude, 14),
        apiService.fetchEarthquakeData(dam.latitude, dam.longitude, 300),
      ]);

      // Extract real values
      const precipForecastArr = weather.daily?.precipitation_sum || [];
      const forecastRainfall = precipForecastArr.length ? Math.max(...precipForecastArr) : 0;

      const histPrecipArr = historical.daily?.precipitation_sum || [];
      const historicalRainfall = histPrecipArr.reduce((s, v) => s + (v || 0), 0);

      const month = new Date().getMonth();
      const seasonalBase = [
        38, 35, 33, 30, 28, 32,
        45, 58, 70, 75, 65, 50,
      ][month];

      const soilM = soil.current?.moisture_0_7cm || soil.avg24h?.moisture_0_7cm || 0;
      const deepSoilM = soil.current?.moisture_28_100cm || soil.avg24h?.moisture_28_100cm || 0;
      const riverDischarge = flood.stats?.latestDischarge || 0;
      const reservoirLevel = Math.max(10, Math.min(
        seasonalBase + (Math.min(dam.capacity / 100, 1) * 15 - 7) + Math.min(historicalRainfall / 10, 15)
          + (Math.min(riverDischarge / Math.max(flood.stats?.maxDischarge || 1, 1), 1) * 12)
          + (Math.min(soilM / 0.4, 1) * 8)
          + (Math.min((flood.stats?.avgDischarge || 0) / 100, 1) * 5),
        98,
      ));

      let rainfallTrend = 'stable';
      if (histPrecipArr.length >= 6) {
        const recent = histPrecipArr.slice(-3).reduce((s, v) => s + (v || 0), 0);
        const earlier = histPrecipArr.slice(0, 3).reduce((s, v) => s + (v || 0), 0);
        if (recent > earlier * 1.3) rainfallTrend = 'increasing';
        else if (recent < earlier * 0.7) rainfallTrend = 'decreasing';
      }

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
      if (hasFreshSummary()) {
        return res.json({ ...summaryCache.payload, cached: true });
      }

      if (!summaryCache.inFlight) {
        summaryCache.inFlight = buildRiskSummary()
          .then((payload) => {
            summaryCache.payload = payload;
            summaryCache.timestamp = Date.now();
            return payload;
          })
          .finally(() => {
            summaryCache.inFlight = null;
          });
      }

      if (summaryCache.payload) {
        return res.json({ ...summaryCache.payload, cached: true, stale: true, refreshing: true });
      }

      const payload = await summaryCache.inFlight;
      return res.json({ ...payload, cached: false });
    } catch (error) { next(error); }
  }

  /* ── Alerts for all dams ─────────────────────────────────────────── */
  async getAlerts(req, res, next) {
    try {
      const { severity = 'all' } = req.query;

      if (!hasFreshSummary()) {
        if (!summaryCache.inFlight) {
          summaryCache.inFlight = buildRiskSummary()
            .then((payload) => {
              summaryCache.payload = payload;
              summaryCache.timestamp = Date.now();
              return payload;
            })
            .finally(() => {
              summaryCache.inFlight = null;
            });
        }

        if (!summaryCache.payload) {
          await summaryCache.inFlight;
        }
      }

      const risks = summaryCache.payload?.risks || [];
      const alerts = buildAlertsFromRisks(risks, severity);

      res.json({
        alerts,
        timestamp: new Date().toISOString(),
        total: alerts.length,
        dataSources: ['Open-Meteo', 'GloFAS', 'NASA POWER', 'USGS'],
      });
    } catch (error) { next(error); }
  }
}

module.exports = new RiskController();
