const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

router.get('/rainfall', dataController.getRainfallData);
router.get('/earthquakes', dataController.getEarthquakeData);
router.get('/reservoirs', dataController.getReservoirLevels);
router.get('/reservoirs/state/:stateName', dataController.getReservoirLevelsByState);
router.get('/reservoirs/:damId', dataController.getReservoirLevelByDam);
router.get('/dams', dataController.getDamLocations);
router.get('/dams/state/:stateName', dataController.getDamsByState);
router.get('/states', dataController.getStates);
router.get('/soil', dataController.getSoilMoisture);
router.get('/discharge', dataController.getRiverDischarge);
router.get('/weather', dataController.getLiveWeatherData);
router.get('/all', dataController.getAllEnvironmentalData);
router.get('/advanced-risk', dataController.getAdvancedRiskAnalysis);

module.exports = router;
