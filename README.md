# 🛰️ India Flood and Landslide Early Warning System

A modern, full-stack web application for real-time flood and landslide risk prediction across India using environmental data from public APIs.

## 📋 Project Overview

This system analyzes real-time environmental data to predict flood and landslide risks across India. It integrates multiple public APIs to provide comprehensive monitoring and early warning capabilities.

### Key Features

✅ **Real-time Data Integration**
- Open-Meteo API for rainfall forecasts
- NASA POWER API for historical rainfall
- USGS Earthquake API for seismic activity
- Simulated Central Water Commission data for reservoir levels

✅ **Advanced Risk Analysis**
- Intelligent flood risk calculation (0-100 score)
- Landslide risk assessment
- 24-hour predictive analytics
- Real-time alert generation

✅ **Interactive Dashboard**
- Professional dark theme UI
- KPI cards and overview statistics
- Real-time risk visualization
- Multi-view interface (Dashboard, Map, Analytics)

✅ **Map Visualization**
- India map with dam locations
- Color-coded risk markers (Green/Yellow/Red)
- Interactive popups with detailed information
- Responsive design

✅ **Data Management**
- 30-60 minute caching to optimize API calls
- Rate limiting for API protection
- Comprehensive error handling
- Auto-refresh every 10 minutes

## 🏗️ Technology Stack

### Frontend
- **React 18** - UI framework
- **Tailwind CSS** - Styling
- **Leaflet.js** - Map visualization
- **Chart.js** - Data visualization
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **Axios** - API client
- **Nodemon** - Development tool

### APIs
- Open-Meteo (Free, no key required)
- NASA POWER (Free, no key required)
- USGS Earthquake Hazards (Free, no key required)

## 📂 Project Structure

```
flood-landslide-warning/
├── backend/
│   ├── server.js                 # Main server file
│   ├── package.json              # Backend dependencies
│   ├── .env.example              # Environment variables
│   ├── routes/
│   │   ├── dataRoutes.js         # Data endpoints
│   │   └── riskRoutes.js         # Risk calculation endpoints
│   ├── controllers/
│   │   ├── dataController.js     # API data logic
│   │   └── riskController.js     # Risk analysis logic
│   ├── services/
│   │   ├── apiService.js         # External API integration
│   │   └── riskAnalysisService.js # Risk calculation engine
│   ├── utils/
│   │   ├── cache.js              # Caching mechanism
│   │   └── damLocations.js       # Dam & zone data
│   └── models/
│       └── (Database models if needed)
│
├── frontend/
│   ├── public/
│   │   └── index.html            # HTML template
│   ├── src/
│   │   ├── App.js                # Main App component
│   │   ├── index.js              # React entry point
│   │   ├── index.css             # Global styles
│   │   ├── components/
│   │   │   ├── Common.jsx        # Reusable components
│   │   │   ├── Dashboard.jsx     # Dashboard view
│   │   │   ├── Map.jsx           # Map component
│   │   │   ├── Charts.jsx        # Chart components
│   │   │   ├── RiskPanel.jsx     # Risk details
│   │   │   └── Layout.jsx        # Layout components
│   │   ├── services/
│   │   │   └── api.js            # API client
│   │   └── utils/
│   │       └── helpers.js        # Utility functions
│   ├── package.json              # Frontend dependencies
│   ├── tailwind.config.js        # Tailwind configuration
│   ├── postcss.config.js         # PostCSS configuration
│   └── .env.example              # Environment variables
│
└── README.md                     # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 14+ and npm 6+
- Git
- Modern web browser

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables:**
   ```env
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   
   OPENMETEO_API_URL=https://api.open-meteo.com/v1
   NASA_POWER_API_URL=https://power.larc.nasa.gov/api/v1
   USGS_EARTHQUAKE_API_URL=https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary
   
   CACHE_DURATION=30
   RATE_LIMIT_WINDOW=15
   RATE_LIMIT_MAX_REQUESTS=100
   ```

5. **Start backend server:**
   ```bash
   npm start
   # Or for development with auto-reload:
   npm run dev
   ```

   Backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables:**
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

5. **Start frontend development server:**
   ```bash
   npm start
   ```

   Frontend will run on `http://localhost:3000` and open automatically in your browser.

### Accessing the Application

Once both servers are running:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health

## 📡 API Endpoints

### Data Endpoints

```
GET /api/data/dams
  - Returns all monitored dam locations
  - Response: { dams: [...], timestamp, total }

GET /api/data/rainfall?latitude=20&longitude=78
  - Returns rainfall forecast and historical data
  - Response: { forecast, historical, timestamp }

GET /api/data/earthquakes?latitude=20&longitude=78&radius=500
  - Returns earthquake data within specified radius
  - Response: { center, radius, earthquakes, timestamp }

GET /api/data/reservoirs
  - Returns current reservoir levels
  - Response: { dams: [...], timestamp, total }

GET /api/data/all?latitude=20&longitude=78
  - Returns all environmental data at once
  - Response: { rainfall, earthquakes, reservoirs, dams, timestamp }
```

### Risk Endpoints

```
POST /api/risk/calculate
  - Calculates risk for specific dam
  - Body: { damId, state }
  - Response: { dam, floodRisk, landslideRisk, alerts, timestamp }

GET /api/risk/all
  - Returns risks for all monitored dams
  - Response: { risks: [...], timestamp, total }

GET /api/risk/alerts?severity=all
  - Returns active alerts
  - Query: severity (all|HIGH|MEDIUM|LOW)
  - Response: { alerts: [...], timestamp, total }
```

## 🧮 Risk Calculation Logic

### Flood Risk Algorithm

**Factors:**
1. **Reservoir Level** (0-50 points)
   - > 85%: 50 points
   - > 75%: 35 points
   - > 60%: 20 points

2. **Rainfall Forecast** (0-30 points)
   - > 80mm: 30 points
   - 50-80mm: 20 points
   - 20-50mm: 10 points

3. **Rainfall Trend** (0-20 points)
   - Increasing + high rainfall: 20 points
   - Increasing: 10 points

**Risk Levels:**
- **HIGH:** Score ≥ 70
- **MEDIUM:** Score 40-69
- **LOW:** Score < 40

### Landslide Risk Algorithm

**Factors:**
1. **Rainfall Accumulation** (0-40 points)
   - > 150mm: 40 points
   - 100-150mm: 30 points
   - 50-100mm: 15 points

2. **Earthquake Activity** (0-40 points)
   - Magnitude > 5: 40 points
   - Magnitude 4.5-5: 30 points
   - Magnitude 4-4.5: 20 points

3. **Region Susceptibility** (0-20 points)
   - High-risk zones: 20 points
   - Medium-risk zones: 10 points

**Risk Levels:**
- **HIGH:** Score ≥ 70
- **MEDIUM:** Score 40-69
- **LOW:** Score < 40

## 🎨 UI Components

### Dashboard View
- KPI Cards (Total Dams, High Risk Zones, Avg Rainfall, Earthquakes)
- System Status Overview
- Alert Summary
- Risk Distribution Charts

### Map View
- Interactive India map with dam markers
- Color-coded risk levels
- Popup information with detailed stats
- Real-time updates

### Analytics View
- Rainfall forecast charts
- Risk trend predictions (24h)
- Reservoir level comparisons

## 🔒 Security Features

- **CORS Protection:** Configured for frontend origin only
- **Rate Limiting:** 100 requests per 15 minutes
- **Environment Variables:** API keys and URLs stored in .env
- **Error Handling:** Comprehensive try-catch blocks
- **Input Validation:** Query parameters validated
- **API Caching:** Reduces external API calls

## 📊 Monitoring Dams

Currently monitoring 10 major dams across India:

1. **Sardar Sarovar** (Gujarat) - Narmada
2. **Bhakra Nangal** (Himachal Pradesh) - Sutlej
3. **Tehri** (Uttarakhand) - Bhagirathi
4. **Mettur** (Tamil Nadu) - Kaveri
5. **Krishna Raja Sagara** (Karnataka) - Kaveri
6. **Damodar Valley** (Jharkhand) - Damodar
7. **Indira Gandhi** (Himachal Pradesh) - Sutlej
8. **Rajiv Gandhi** (Tamil Nadu) - Godavari
9. **Mullaperiyar** (Kerala) - Periyar
10. **Koyna** (Maharashtra) - Koyna

## 📍 Landslide-Prone Zones

The system monitors high-risk zones:
- **Western Ghats:** Kerala, Tamil Nadu, Karnataka, Maharashtra, Goa
- **Himalayas:** Himachal Pradesh, Uttarakhand, Jammu & Kashmir
- **Northeast Hills:** Assam, Meghalya, Mizoram, Nagaland, Manipur
- **Eastern Ghats:** Odisha, Andhra Pradesh, Telangana

## 🌐 Deployment

### Deploy Backend to Render

1. **Create Render account:** https://render.com
2. **Connect GitHub repository**
3. **Deploy with Blueprint (recommended):**
   - In Render, choose **New +** -> **Blueprint**
   - Select this repository (uses `render.yaml` automatically)
4. **Set required environment variable:**
   - `FRONTEND_URL=https://your-frontend.vercel.app`
5. **Deploy:** Click "Apply" / "Deploy"

If you prefer manual setup instead of Blueprint:
- Root Directory: `backend`
- Environment: Node
- Build Command: `npm install`
- Start Command: `npm start`

### Deploy Frontend to Vercel

1. **Create Vercel account:** https://vercel.com
2. **Connect GitHub repository**
3. **Configure Project:**
   - If you keep **Root Directory = repository root**:
     - Framework: Other
     - Build Command: `npm run build`
     - Output Directory: `frontend/build`
   - If you set **Root Directory = frontend** (recommended):
     - Framework: React
     - Build Command: `npm run build`
     - Output Directory: `build`
4. **Add Environment Variables:**
   ```
   REACT_APP_API_URL=https://your-backend-url.com/api
   ```
5. **Deploy:** Vercel will auto-deploy

### Alternative: Deploy to GitHub Pages (Frontend only)

1. **Update package.json:**
   ```json
   "homepage": "https://username.github.io/repo-name"
   ```

2. **Install gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

3. **Add deploy scripts:**
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d build"
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

## 📈 Performance Optimization

- **API Caching:** 30-60 minute cache reduces external API calls
- **Lazy Loading:** Components load on demand
- **Code Splitting:** React automatically handles this
- **Image Optimization:** Leaflet uses optimized tiles
- **Responsive Design:** Mobile-friendly interface

## 🧪 Testing

### Test Backend Health

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-02-18T10:30:00.000Z"
}
```

### Test Data Endpoints

```bash
# Get all dams
curl http://localhost:5000/api/data/dams

# Get rainfall data
curl "http://localhost:5000/api/data/rainfall?latitude=20&longitude=78"

# Get all risks
curl http://localhost:5000/api/risk/all

# Get active alerts
curl http://localhost:5000/api/risk/alerts
```

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is in use
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill process if needed and restart
```

### CORS Errors
- Ensure backend is running on port 5000
- Check FRONTEND_URL in backend .env
- Verify frontend is on localhost:3000

### API Data Not Loading
- Check backend is running: `curl http://localhost:5000/api/health`
- Verify internet connection for external APIs
- Check browser console for error messages
- Review backend logs for API errors

### Map Not Displaying
- Ensure Leaflet CSS is loaded
- Check browser console for JavaScript errors
- Verify dams are being fetched from API
- Try hard refresh (Ctrl+Shift+R)

## 📚 Additional Resources

- **Open-Meteo API:** https://open-meteo.com/
- **NASA POWER API:** https://power.larc.nasa.gov/
- **USGS Earthquakes:** https://earthquake.usgs.gov/
- **Leaflet.js:** https://leafletjs.com/
- **Chart.js:** https://www.chartjs.org/
- **Tailwind CSS:** https://tailwindcss.com/

## 🔄 Auto-Refresh Feature

The dashboard auto-refreshes data every 10 minutes. You can also manually refresh using the refresh button in the header.

Cache duration: 30 minutes per API

## 📝 License

MIT License - Feel free to use for academic and commercial purposes.

## 👨‍💼 Support

For issues or questions:
1. Check the troubleshooting section
2. Review backend logs
3. Check browser console
4. Verify all dependencies are installed

## 🎯 Future Enhancements

- [ ] Historical data comparison
- [ ] PDF report export
- [ ] SMS/Email alerts
- [ ] Machine learning predictions
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Real-time WebSocket updates
- [ ] Advanced filtering and search
- [ ] User authentication
- [ ] Database integration

---

**Last Updated:** February 18, 2026
**Version:** 1.0.0
