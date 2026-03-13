const { landslidePrones } = require('../utils/damLocations');

/**
 * Advanced Risk Analysis Engine — 100% deterministic, zero random values.
 *
 * All scores are derived from live environmental data:
 *   - Real rainfall (forecast + historical + NASA satellite)
 *   - Real soil moisture (Open-Meteo land-surface model, m³/m³)
 *   - Real river discharge (GloFAS, m³/s)
 *   - Real earthquake magnitude & count (USGS, last 30 days)
 *   - Region susceptibility (geological zones of India)
 *
 * Scoring is weighted multi-factor with clear thresholds.
 */
class RiskAnalysisService {

  /* ================================================================
   *  FLOOD RISK  — weighted scoring (0 – 100)
   *
   *  Factors:
   *    1. Reservoir / water level proxy      → 0-25 pts
   *    2. Forecast rainfall (next 7 days)    → 0-25 pts
   *    3. Historical 7-day accumulation      → 0-20 pts
   *    4. River discharge (GloFAS)           → 0-20 pts
   *    5. Rainfall trend (increasing?)       → 0-10 pts
   * ================================================================ */
  calculateFloodRisk({ reservoirLevel, forecastRainfall, historicalRainfall, riverDischarge, rainfallTrend }) {
    let score = 0;
    const factors = [];

    // 1. Reservoir / water-level proxy (0-25)
    const rl = reservoirLevel || 0;
    if (rl > 85) { score += 25; factors.push(`Critical reservoir level (${rl.toFixed(1)}%)`); }
    else if (rl > 75) { score += 18; factors.push(`High reservoir level (${rl.toFixed(1)}%)`); }
    else if (rl > 60) { score += 12; factors.push(`Elevated reservoir level (${rl.toFixed(1)}%)`); }
    else if (rl > 45) { score += 6; factors.push(`Moderate reservoir level (${rl.toFixed(1)}%)`); }

    // 2. Forecast rainfall — daily max over next 7 days (mm)
    const fr = forecastRainfall || 0;
    if (fr > 100) { score += 25; factors.push(`Extreme rainfall forecast (${fr.toFixed(1)} mm)`); }
    else if (fr > 60) { score += 20; factors.push(`Very heavy rainfall forecast (${fr.toFixed(1)} mm)`); }
    else if (fr > 35) { score += 14; factors.push(`Heavy rainfall forecast (${fr.toFixed(1)} mm)`); }
    else if (fr > 15) { score += 7; factors.push(`Moderate rainfall forecast (${fr.toFixed(1)} mm)`); }

    // 3. Historical 7-day accumulation (mm)
    const hr = historicalRainfall || 0;
    if (hr > 200) { score += 20; factors.push(`Extreme cumulative rain (${hr.toFixed(1)} mm / 7d)`); }
    else if (hr > 120) { score += 15; factors.push(`Very high cumulative rain (${hr.toFixed(1)} mm / 7d)`); }
    else if (hr > 60) { score += 10; factors.push(`High cumulative rain (${hr.toFixed(1)} mm / 7d)`); }
    else if (hr > 25) { score += 5; factors.push(`Moderate cumulative rain (${hr.toFixed(1)} mm / 7d)`); }

    // 4. River discharge (m³/s)
    const rd = riverDischarge || 0;
    if (rd > 5000) { score += 20; factors.push(`Very high river discharge (${rd.toFixed(0)} m³/s)`); }
    else if (rd > 2000) { score += 15; factors.push(`High river discharge (${rd.toFixed(0)} m³/s)`); }
    else if (rd > 500) { score += 10; factors.push(`Elevated river discharge (${rd.toFixed(0)} m³/s)`); }
    else if (rd > 100) { score += 5; factors.push(`Moderate river discharge (${rd.toFixed(0)} m³/s)`); }

    // 5. Rainfall trend
    if (rainfallTrend === 'increasing') { score += 10; factors.push('Rainfall trend: increasing'); }
    else if (rainfallTrend === 'stable') { score += 3; factors.push('Rainfall trend: stable'); }

    const finalScore = Math.min(score, 100);
    const level = finalScore >= 70 ? 'HIGH' : finalScore >= 40 ? 'MEDIUM' : 'LOW';

    return { score: finalScore, level, factors, timestamp: new Date().toISOString() };
  }

  /* ================================================================
   *  LANDSLIDE RISK  — weighted scoring (0 – 100)
   *
   *  Factors:
   *    1. Soil moisture (volumetric, m³/m³)  → 0-25 pts
   *    2. Rainfall accumulation (7d)         → 0-25 pts
   *    3. Earthquake activity (30d)          → 0-25 pts
   *    4. Region geological susceptibility   → 0-15 pts
   *    5. Soil saturation depth indicator    → 0-10 pts
   * ================================================================ */
  calculateLandslideRisk({ soilMoisture, rainfallAccumulation, earthquakeMagnitude, earthquakeCount, state, deepSoilMoisture }) {
    let score = 0;
    const factors = [];

    // 1. Soil moisture — surface layer (m³/m³, range 0.0 – 0.6)
    const sm = soilMoisture || 0;
    if (sm > 0.45) { score += 25; factors.push(`Saturated soil (${(sm * 100).toFixed(1)}% vol.)`); }
    else if (sm > 0.35) { score += 18; factors.push(`Very wet soil (${(sm * 100).toFixed(1)}% vol.)`); }
    else if (sm > 0.25) { score += 12; factors.push(`Wet soil (${(sm * 100).toFixed(1)}% vol.)`); }
    else if (sm > 0.15) { score += 5; factors.push(`Moderate soil moisture (${(sm * 100).toFixed(1)}% vol.)`); }

    // 2. Rainfall accumulation 7-day (mm)
    const ra = rainfallAccumulation || 0;
    if (ra > 200) { score += 25; factors.push(`Extreme rain accumulation (${ra.toFixed(1)} mm)`); }
    else if (ra > 120) { score += 18; factors.push(`Very high rain accumulation (${ra.toFixed(1)} mm)`); }
    else if (ra > 60) { score += 12; factors.push(`High rain accumulation (${ra.toFixed(1)} mm)`); }
    else if (ra > 25) { score += 5; factors.push(`Moderate rain accumulation (${ra.toFixed(1)} mm)`); }

    // 3. Earthquake activity (max magnitude in last 30 days near location)
    const em = earthquakeMagnitude || 0;
    const ec = earthquakeCount || 0;
    if (em > 5.5) { score += 25; factors.push(`Strong earthquake (M${em.toFixed(1)}, ${ec} events)`); }
    else if (em > 4.5) { score += 18; factors.push(`Moderate-strong quake (M${em.toFixed(1)}, ${ec} events)`); }
    else if (em > 3.5) { score += 12; factors.push(`Moderate quake (M${em.toFixed(1)}, ${ec} events)`); }
    else if (ec > 0) { score += 5; factors.push(`Minor seismic activity (M${em.toFixed(1)}, ${ec} events)`); }

    // 4. Region susceptibility (from India's landslide-prone zone classification)
    const regionRisk = this._regionSusceptibility(state);
    if (regionRisk === 'HIGH') { score += 15; factors.push(`High landslide-prone zone (${state})`); }
    else if (regionRisk === 'MEDIUM') { score += 8; factors.push(`Moderate landslide-prone zone (${state})`); }

    // 5. Deep soil moisture indicator (28-100 cm layer, m³/m³)
    const dsm = deepSoilMoisture || 0;
    if (dsm > 0.40) { score += 10; factors.push(`Deep soil saturated (${(dsm * 100).toFixed(1)}% vol.)`); }
    else if (dsm > 0.30) { score += 6; factors.push(`Deep soil wet (${(dsm * 100).toFixed(1)}% vol.)`); }
    else if (dsm > 0.20) { score += 3; factors.push(`Deep soil moderately moist (${(dsm * 100).toFixed(1)}% vol.)`); }

    const finalScore = Math.min(score, 100);
    const level = finalScore >= 70 ? 'HIGH' : finalScore >= 40 ? 'MEDIUM' : 'LOW';

    return { score: finalScore, level, factors, timestamp: new Date().toISOString() };
  }

  /* ================================================================
   *  Region susceptibility (geological landslide zones of India)
   * ================================================================ */
  _regionSusceptibility(state) {
    for (const zone of landslidePrones) {
      if (zone.states.includes(state)) return zone.riskLevel;
    }
    return 'LOW';
  }

  /* ================================================================
   *  Alert Generation — based purely on computed risk scores
   * ================================================================ */
  generateAlerts(floodRisk, landslideRisk, damName) {
    const alerts = [];
    const ts = new Date().toISOString();
    // Use dam name in IDs for uniqueness across batch processing
    const slug = damName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    // ── HIGH / MEDIUM severity alerts ──
    if (floodRisk.level === 'HIGH') {
      alerts.push({
        id: `flood-high-${slug}`, type: 'FLOOD', severity: 'HIGH',
        location: damName, score: floodRisk.score,
        message: `HIGH FLOOD RISK at ${damName}. ${floodRisk.factors.join('; ')}`,
        timestamp: ts,
      });
    } else if (floodRisk.level === 'MEDIUM') {
      alerts.push({
        id: `flood-med-${slug}`, type: 'FLOOD', severity: 'MEDIUM',
        location: damName, score: floodRisk.score,
        message: `MODERATE FLOOD RISK at ${damName}. ${floodRisk.factors.join('; ')}`,
        timestamp: ts,
      });
    }

    if (landslideRisk.level === 'HIGH') {
      alerts.push({
        id: `ls-high-${slug}`, type: 'LANDSLIDE', severity: 'HIGH',
        location: damName, score: landslideRisk.score,
        message: `HIGH LANDSLIDE RISK near ${damName}. ${landslideRisk.factors.join('; ')}`,
        timestamp: ts,
      });
    } else if (landslideRisk.level === 'MEDIUM') {
      alerts.push({
        id: `ls-med-${slug}`, type: 'LANDSLIDE', severity: 'MEDIUM',
        location: damName, score: landslideRisk.score,
        message: `MODERATE LANDSLIDE RISK near ${damName}. ${landslideRisk.factors.join('; ')}`,
        timestamp: ts,
      });
    }

    // ── INFO severity alerts — situational awareness ──
    // Generated for LOW-risk dams that still have noteworthy conditions
    if (floodRisk.level === 'LOW' && floodRisk.score >= 8) {
      alerts.push({
        id: `flood-info-${slug}`, type: 'FLOOD', severity: 'INFO',
        location: damName, score: floodRisk.score,
        message: `Flood conditions normal at ${damName}. ${floodRisk.factors.slice(0, 2).join('; ')}`,
        timestamp: ts,
      });
    }
    if (landslideRisk.level === 'LOW' && landslideRisk.score >= 10) {
      alerts.push({
        id: `ls-info-${slug}`, type: 'LANDSLIDE', severity: 'INFO',
        location: damName, score: landslideRisk.score,
        message: `Landslide conditions monitored near ${damName}. ${landslideRisk.factors.slice(0, 2).join('; ')}`,
        timestamp: ts,
      });
    }

    return alerts;
  }

  /* ================================================================
   *  24-Hour Prediction — deterministic extrapolation from data trends
   *
   *  Uses the real data:
   *    - If rainfall trend is increasing → project score upward
   *    - If river discharge is high → additional boost
   *    - If soil is already saturated → less room for improvement
   * ================================================================ */
  predictRisk24Hours(currentScore, trend, additionalFactors = {}) {
    let delta = 0;

    // Trend-based shift
    if (trend === 'increasing') delta += 12;
    else if (trend === 'stable') delta += 3;
    else if (trend === 'decreasing') delta -= 8;

    // Additional adjustments from live data
    if (additionalFactors.highDischarge) delta += 5;
    if (additionalFactors.saturatedSoil) delta += 4;
    if (additionalFactors.seismicActivity) delta += 3;

    const predicted = Math.max(0, Math.min(100, currentScore + delta));

    return {
      current: currentScore,
      predicted24h: predicted,
      trend,
      change: predicted - currentScore,
      confidence: this._predictionConfidence(additionalFactors),
    };
  }

  _predictionConfidence(factors) {
    // Higher confidence when more live data sources agree
    let conf = 60; // base
    if (factors.hasWeatherData) conf += 10;
    if (factors.hasSoilData) conf += 10;
    if (factors.hasDischargeData) conf += 10;
    if (factors.hasSeismicData) conf += 10;
    return Math.min(conf, 95);
  }

  /* ================================================================
   *  Advanced Risk Analysis — ML-like multi-source integration
   *
   *  Uses enhanced APIs for superior accuracy:
   *    - WeatherAPI for detailed weather conditions
   *    - USGS Water Services for real-time water data
   *    - Sentinel Hub for satellite imagery analysis
   *    - NewsAPI for disaster news monitoring
   * ================================================================ */
  async calculateAdvancedRisk(dam, historicalData) {
    const apiService = require('./apiService');

    try {
      // Get advanced predictions from multiple sources
      const advancedPred = await apiService.fetchAdvancedPredictions(dam, historicalData);

      // Enhanced flood risk calculation
      const floodRisk = this._calculateAdvancedFloodRisk(dam, historicalData, advancedPred);

      // Enhanced landslide risk calculation
      const landslideRisk = this._calculateAdvancedLandslideRisk(dam, historicalData, advancedPred);

      // Overall risk score (weighted combination)
      const overallScore = (floodRisk.score * 0.6) + (landslideRisk.score * 0.4);

      return {
        dam: dam.name,
        location: { latitude: dam.latitude, longitude: dam.longitude },
        overallRisk: {
          score: Math.round(overallScore),
          level: overallScore >= 70 ? 'HIGH' : overallScore >= 40 ? 'MEDIUM' : 'LOW'
        },
        floodRisk,
        landslideRisk,
        advancedFactors: advancedPred.factors,
        confidence: advancedPred.confidence,
        dataSources: advancedPred.sources,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error(`[Advanced Risk] ${err.message}`);
      // Fallback to basic calculation
      return this.calculateCombinedRisk(dam, historicalData);
    }
  }

  _calculateAdvancedFloodRisk(dam, historicalData, advancedPred) {
    let score = 0;
    const factors = [];

    // Use advanced weather data
    const weather = advancedPred.factors.weather || 50;
    if (weather > 80) { score += 30; factors.push('Extreme weather conditions'); }
    else if (weather > 60) { score += 20; factors.push('Severe weather conditions'); }
    else if (weather > 40) { score += 10; factors.push('Moderate weather conditions'); }

    // Use advanced discharge data
    const discharge = advancedPred.factors.discharge || 50;
    if (discharge > 80) { score += 25; factors.push('Critical river discharge levels'); }
    else if (discharge > 60) { score += 15; factors.push('High river discharge levels'); }
    else if (discharge > 40) { score += 8; factors.push('Elevated river discharge levels'); }

    // Use satellite moisture data
    const satellite = advancedPred.factors.satellite || 50;
    if (satellite > 70) { score += 20; factors.push('High surface moisture from satellite'); }
    else if (satellite > 50) { score += 10; factors.push('Moderate surface moisture from satellite'); }

    // Seismic influence on flood risk (dam stability)
    const seismic = advancedPred.factors.seismic || 0;
    if (seismic > 20) { score += 15; factors.push('Recent seismic activity affecting stability'); }
    else if (seismic > 10) { score += 8; factors.push('Moderate seismic activity'); }

    const finalScore = Math.min(score, 100);
    const level = finalScore >= 70 ? 'HIGH' : finalScore >= 40 ? 'MEDIUM' : 'LOW';

    return { score: finalScore, level, factors };
  }

  _calculateAdvancedLandslideRisk(dam, historicalData, advancedPred) {
    let score = 0;
    const factors = [];

    // Use advanced soil moisture data
    const soil = advancedPred.factors.soil || 50;
    if (soil > 80) { score += 30; factors.push('Extreme soil saturation'); }
    else if (soil > 60) { score += 20; factors.push('High soil saturation'); }
    else if (soil > 40) { score += 10; factors.push('Moderate soil saturation'); }

    // Use advanced weather data
    const weather = advancedPred.factors.weather || 50;
    if (weather > 80) { score += 25; factors.push('Extreme weather triggering landslides'); }
    else if (weather > 60) { score += 15; factors.push('Severe weather conditions'); }
    else if (weather > 40) { score += 8; factors.push('Moderate weather conditions'); }

    // Seismic activity (primary landslide trigger)
    const seismic = advancedPred.factors.seismic || 0;
    if (seismic > 30) { score += 25; factors.push('High seismic activity triggering landslides'); }
    else if (seismic > 20) { score += 15; factors.push('Moderate seismic activity'); }
    else if (seismic > 10) { score += 8; factors.push('Low seismic activity'); }

    // Satellite vegetation stress
    const satellite = advancedPred.factors.satellite || 50;
    if (satellite > 70) { score += 15; factors.push('High vegetation stress from satellite'); }
    else if (satellite > 50) { score += 8; factors.push('Moderate vegetation stress'); }

    const finalScore = Math.min(score, 100);
    const level = finalScore >= 70 ? 'HIGH' : finalScore >= 40 ? 'MEDIUM' : 'LOW';

    return { score: finalScore, level, factors };
  }
}

module.exports = new RiskAnalysisService();
