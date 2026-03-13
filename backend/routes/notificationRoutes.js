const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.post('/email', (req, res) => notificationController.sendEmail(req, res));
router.post('/sms', (req, res) => notificationController.sendSMS(req, res));

module.exports = router;