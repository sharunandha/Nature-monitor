const nodemailer = require('nodemailer');

/**
 * Notification Controller - Handles email and SMS notifications
 * For demo purposes, we'll log notifications. For production, configure SMTP.
 */

class NotificationController {
  constructor() {
    // Configure email transporter (use environment variables for production)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendEmail(req, res) {
    try {
      const { to, subject, message, settings } = req.body;

      if (!to || !subject || !message) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, message' });
      }

      // For demo/development, just log the notification
      if (!process.env.SMTP_USER) {
        console.log('📧 DEMO EMAIL NOTIFICATION:');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Message: ${message}`);
        console.log(`Settings:`, settings);

        return res.json({
          success: true,
          message: 'Demo notification logged successfully',
          note: 'Configure SMTP credentials for real email sending'
        });
      }

      // Send real email
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: to,
        subject: subject,
        html: message
      };

      await this.transporter.sendMail(mailOptions);

      res.json({
        success: true,
        message: 'Email sent successfully'
      });

    } catch (error) {
      console.error('Email sending error:', error);
      res.status(500).json({
        error: 'Failed to send email',
        details: error.message
      });
    }
  }

  async sendSMS(req, res) {
    try {
      const { to, message } = req.body;

      if (!to || !message) {
        return res.status(400).json({ error: 'Missing required fields: to, message' });
      }

      // For demo, just log SMS
      console.log('📱 DEMO SMS NOTIFICATION:');
      console.log(`To: ${to}`);
      console.log(`Message: ${message}`);

      res.json({
        success: true,
        message: 'Demo SMS logged successfully',
        note: 'Configure SMS service for real SMS sending'
      });

    } catch (error) {
      console.error('SMS sending error:', error);
      res.status(500).json({
        error: 'Failed to send SMS',
        details: error.message
      });
    }
  }
}

module.exports = new NotificationController();