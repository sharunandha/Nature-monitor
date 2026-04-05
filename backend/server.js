require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dataRoutes = require('./routes/dataRoutes');
const riskRoutes = require('./routes/riskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Render and other PaaS terminate TLS at a proxy and forward client IP via X-Forwarded-For.
// Without trust proxy, express-rate-limit can misidentify clients and emit ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

function normalizeOrigin(url) {
  if (!url) return '';
  return url.replace(/\/$/, '');
}

function isAllowedDeploymentHost(origin) {
  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith('.vercel.app') || hostname.endsWith('.up.railway.app');
  } catch {
    return false;
  }
}

// Middleware — allow localhost (dev) + deployed frontends (Vercel/Railway/custom)
app.use(cors({
  origin: function (origin, callback) {
    const configuredFrontend = normalizeOrigin(process.env.FRONTEND_URL);
    const requestOrigin = normalizeOrigin(origin);

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Localhost for development
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    // Vercel/Railway deployed frontend domains
    if (isAllowedDeploymentHost(origin)) return callback(null, true);
    // Custom domain (set FRONTEND_URL env var)
    if (configuredFrontend && requestOrigin === configuredFrontend) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// Rate limiting — higher limit to support 50+ dam data loads
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    mode: 'LIVE DATA',
    dataSources: [
      'Open-Meteo Weather Forecast API',
      'Open-Meteo Land-Surface Soil Moisture',
      'Open-Meteo GloFAS River Discharge',
      'NASA POWER Satellite Precipitation',
      'USGS Earthquake Hazards Program',
    ],
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/data', dataRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Serve front-end build (if present) for non-API routes
const buildDir = path.join(__dirname, '..', 'frontend', 'build');
const hasFrontendBuild = require('fs').existsSync(path.join(buildDir, 'index.html'));

if (hasFrontendBuild) {
  app.use(express.static(buildDir));

  app.get('*', (req, res) => {
    // For any non-API route, return the React app index file
    res.sendFile(path.join(buildDir, 'index.html'));
  });
} else {
  // 404 handler for API-only / development
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

const { damLocations } = require('./utils/damLocations');

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Mode: LIVE DATA (all values from real APIs)`);
  console.log(`🏗️  Monitoring ${damLocations.length} dams across India`);
  console.log(`📊 Data sources: Open-Meteo, GloFAS, NASA POWER, USGS`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Allow up to 2 minutes for responses (50+ dams × 6 APIs each on first load)
server.timeout = 120000;
