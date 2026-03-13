# Flood & Landslide Warning System - Complete Technical Details

## 1. Overview
This platform is a full-stack India-wide dam risk monitoring system for:
- Flood risk
- Landslide risk
- Rainfall forecasting
- Real-time weather and environmental context
- Emergency notification workflows

It includes:
- A React frontend dashboard (multi-view: Dashboard, Map, Charts)
- A Node.js + Express backend API
- Multi-source live data integration
- PDF reporting
- Email notification integration via Gmail SMTP

---

## 2. Technology Stack (What it uses and why)

### Frontend
- React 18: component-driven UI, fast interaction updates
- Tailwind CSS: responsive design utility classes
- Chart.js + react-chartjs-2: risk and rainfall visual analytics
- Leaflet: interactive geospatial map with markers/zones
- Axios: robust API client for backend calls
- jsPDF + jspdf-autotable: PDF generation with tables and visuals

Why:
- Fast UI rendering, clear component architecture
- Works on desktop + mobile
- Direct support for charting and map interaction
- Easy PDF export with analytical tables

### Backend
- Node.js + Express: lightweight API layer for orchestrating live data
- Axios: outbound calls to weather/seismic/flood sources
- Nodemailer: SMTP email notification delivery
- Caching utility: reduces rate-limit pressure and repeated calls

Why:
- Good for aggregating multiple APIs
- Fast response orchestration using Promise-based parallel fetch
- Easy routing/controller separation for maintainability

---

## 3. Data Sources (Where data comes from)

Primary live feeds in active backend:
1. Open-Meteo Forecast API
- Forecast precipitation
- Temperature
- Humidity
- Pressure
- Wind

2. Open-Meteo Historical
- Past rainfall history

3. Open-Meteo Land-Surface Model
- Soil moisture layers

4. Open-Meteo GloFAS flood feed
- River discharge metrics

5. NASA POWER
- Satellite precipitation series

6. USGS Earthquake feed
- Earthquake count, magnitude, recency near dam regions

7. WeatherAPI (optional key)
- Used to enrich condition text when key is configured

8. NewsAPI / Sentinel Hub style advanced channels
- Advanced risk enrichment path exists; fallback behavior now avoids random values

Important:
- The mock backend exists as a separate file, but production app route is using server.js live routes.

---

## 4. Runtime Flow (How it works)

### Frontend flow
1. App loads and calls backend:
- /api/data/dams
- /api/risk/all
- /api/risk/alerts

2. User selects a dam (drawer or map marker)
3. Frontend fetches selected-dam details:
- /api/risk/calculate
- /api/data/rainfall
- /api/data/advanced-risk
- /api/data/weather

4. UI updates Dashboard, Map panel, and Charts based on latest responses

### Backend flow
1. Route layer receives request
2. Controller validates parameters
3. Service layer fetches external APIs in parallel
4. Risk service computes flood/landslide scores
5. JSON response returned with timestamps and sources

---

## 5. Risk Computation Model (How it measures and calculates)

### Flood risk inputs
- Reservoir stress proxy
- Forecast rainfall
- Historical accumulated rainfall
- River discharge
- Rainfall trend

### Landslide risk inputs
- Surface/deep soil moisture
- Rainfall accumulation
- Earthquake count and magnitude
- Regional contextual factors

### Advanced risk
- Combines multiple factors with weighted logic
- Produces:
- current score
- 24h prediction
- factor list
- confidence estimate

### Historical comparison
- Current live score is source of truth
- Historical baseline in charts is model-derived (deterministic), not random

---

## 6. Accuracy Model (How accurate it is)

### Strong points
- Core weather/rainfall/discharge/earthquake values are live API-driven
- No random generation in active backend service paths for primary risk/weather outputs
- Deterministic transformations for derived indicators
- Caching reduces transient API jitter and improves consistency

### Limitations
- Some enriched channels depend on optional API keys
- Historical baseline chart values are estimated from current live risk where direct historical labels are not available from source APIs
- Reservoir level is modeled from environmental signals where direct official reservoir API coverage is unavailable

### Practical interpretation
- Operationally useful for situational awareness and prioritization
- Best used as decision-support layer, not single-source emergency authority

---

## 7. Major Faults Found and Repaired

### A. Map usability on mobile was poor
Fault:
- Hard to pan/zoom on touch devices
- Risk panel constrained below map

Fixes:
- Enabled touch-friendly map options and explicit zoom controls
- Improved map and panel responsive layout across breakpoints
- Risk details now render properly below map on small screens

### B. Map legend blocked too much visible map area
Fault:
- Legend was too large and intrusive

Fixes:
- Made legend compact
- Moved to top-right with reduced footprint
- Added mobile-specific compact sizing

### C. Medium flood risk zones not visually separated
Fault:
- Only high-risk circles were shown

Fixes:
- Added separate medium flood risk zone circles
- Added medium zone entry in legend

### D. Risk gauge overlap on laptop
Fault:
- Gauge sizing could clash in tight layouts

Fixes:
- Responsive gauge resizing and safer score rendering

### E. Chart export requirements not met
Fault:
- CSV/text behavior instead of full PDF analysis

Fixes:
- Implemented PDF exports with:
- labels
- analytical summaries
- tables
- visual chart-like bar sections
- Switched chart export buttons to explicit PDF actions

### F. Non-live/random predictive values in frontend analytics
Fault:
- Predictive impact panel used random values for population/economics/evacuation

Fixes:
- Replaced with deterministic estimates derived from live risk/capacity inputs

### G. Notification route context bug
Fault:
- Controller method binding could lose this-context

Fixes:
- Wrapped route handlers to preserve controller instance context
- Verified SMTP email send success

### H. Simulated random satellite proxy in backend advanced path
Fault:
- Random simulation values in satellite analysis helper

Fixes:
- Replaced with deterministic proxy calculations derived from live weather/soil/discharge

---

## 8. Device Responsiveness Status

Current behavior after fixes:
- Dashboard: responsive cards/charts with adaptive spacing
- Map: touch zoom + drag, compact legend, responsive panel stacking
- Charts: mobile-safe containers and export controls
- Drawer: mobile overlay + searchable dam selection
- Header/controls: wrap and adapt on narrow widths

---

## 9. Validation Performed (Complete checks)

### Build validation
- Frontend production build: PASS

### API route validation
- /api/health: PASS
- /api/data/dams: PASS
- /api/risk/all: PASS
- /api/risk/alerts: PASS
- /api/data/weather: PASS
- /api/data/rainfall: PASS
- /api/data/advanced-risk: PASS

### Email validation
- /api/notifications/email: PASS (SMTP send success)

### Random/mock scan validation
- Active frontend/backend runtime paths cleaned for random risk/weather generation
- Remaining random references are isolated to mock backend file (not active main server path)

---

## 10. Security and Operations Notes

- SMTP credentials are in backend .env and should remain private
- Rotate app passwords if shared accidentally
- Keep .env out of git (already ignored)
- Set optional API keys for WeatherAPI/NewsAPI/Sentinel channels to improve enrichment quality

---

## 11. File-Level Change Summary

Frontend key files:
- frontend/src/components/Map.jsx
- frontend/src/components/Common.jsx
- frontend/src/components/Dashboard.jsx
- frontend/src/App.js
- frontend/src/index.css
- frontend/src/utils/helpers.js

Backend key files:
- backend/services/apiService.js
- backend/controllers/dataController.js
- backend/routes/dataRoutes.js
- backend/routes/notificationRoutes.js
- backend/controllers/notificationController.js
- backend/.env

---

## 12. What to monitor next
1. Add formal integration tests for map touch behavior and export functions
2. Add explicit provenance tags in UI (measured vs modeled vs estimated)
3. Add server-side metrics for upstream API latency and failure rates
4. Add alert throttling and notification history logs
5. Add direct official reservoir feed integration if source becomes reliably available

---

## 13. Final Operational Status
The website now runs as a live-data-driven, multi-device-supportive monitoring platform with:
- responsive UX
- improved map usability
- medium flood zone visibility
- validated API flow
- real email notifications
- full PDF analytics exports
- documented architecture and processing model
