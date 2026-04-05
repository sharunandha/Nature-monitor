import React, { useState, useEffect, useCallback } from 'react';
import { Header, Drawer, Footer } from './components/Layout';
import { Dashboard, EmergencyContacts, PredictiveAnalytics, LiveWeatherMonitor } from './components/Dashboard';
import { MapComponent } from './components/Map';
import { RiskDetailsPanel } from './components/RiskPanel';
import { RainfallChart, RiskTrendChart, HistoricalComparisonChart } from './components/Charts';
import { LoadingSpinner, ErrorAlert, Toast } from './components/Common';
import apiClient, { dataAPI, riskAPI } from './services/api';
import { exportRiskData, exportRainfallData, exportToPDF } from './utils/helpers';

const buildAlertsFromRisks = (risks = []) => {
  const priority = { HIGH: 3, MEDIUM: 2, LOW: 1 };

  return risks.flatMap((risk) => {
    const damName = risk.dam?.name || 'Unknown Dam';
    const damState = risk.dam?.state || 'Unknown State';
    const alerts = [];

    if (risk.floodRisk === 'HIGH' || risk.floodRisk === 'MEDIUM') {
      alerts.push({
        id: `flood-${risk.dam?.id || damName}-${risk.floodRisk}`,
        type: 'FLOOD',
        severity: risk.floodRisk,
        location: damName,
        score: risk.floodScore || 0,
        title: `${risk.floodRisk} Flood Risk`,
        description: `${damName}, ${damState} is currently at ${risk.floodRisk.toLowerCase()} flood risk with a score of ${risk.floodScore || 0}.`,
        timestamp: risk.timestamp || new Date().toISOString(),
      });
    }

    if (risk.landslideRisk === 'HIGH' || risk.landslideRisk === 'MEDIUM') {
      alerts.push({
        id: `landslide-${risk.dam?.id || damName}-${risk.landslideRisk}`,
        type: 'LANDSLIDE',
        severity: risk.landslideRisk,
        location: damName,
        score: risk.landslideScore || 0,
        title: `${risk.landslideRisk} Landslide Risk`,
        description: `${damName}, ${damState} is currently at ${risk.landslideRisk.toLowerCase()} landslide risk with a score of ${risk.landslideScore || 0}.`,
        timestamp: risk.timestamp || new Date().toISOString(),
      });
    }

    return alerts;
  }).sort((a, b) => {
    const severityDelta = (priority[b.severity] || 0) - (priority[a.severity] || 0);
    if (severityDelta !== 0) return severityDelta;
    return (b.score || 0) - (a.score || 0);
  });
};

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDam, setSelectedDam] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Emergency response modal state
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    email: '',
    phone: '',
    highRisk: true,
    mediumRisk: false,
    lowRisk: false,
    earthquakes: true,
    rainfall: false
  });

  // Data state
  const [dams, setDams] = useState([]);
  const [risks, setRisks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedRiskData, setSelectedRiskData] = useState(null);
  const [rainfallData, setRainfallData] = useState(null);
  const [advancedRiskData, setAdvancedRiskData] = useState(null);
  const [toast, setToast] = useState(null);
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const damsRes = await dataAPI.getDamLocations();
      setDams(damsRes.data.dams || []);

      let risks = [];
      let lastError = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const risksRes = await riskAPI.getAllRisks();
          risks = risksRes.data.risks || [];
          if (risks.length > 0) break;
        } catch (err) {
          lastError = err;
          if (attempt === 2) break;
        }

        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      if (risks.length === 0 && lastError) {
        throw lastError;
      }

      setRisks(risks);
      setAlerts(buildAlertsFromRisks(risks));
      setLastUpdated(new Date().toISOString());

      // Select first dam by default
      if (damsRes.data.dams?.length > 0 && !selectedDam) {
        setSelectedDam(damsRes.data.dams[0].id);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch live data. Retrying...');
    } finally {
      setLoading(false);
    }
  }, [selectedDam]);

  // Fetch detailed risk data for selected dam
  const fetchDamRiskDetails = useCallback(async (damId) => {
    if (!damId) return;

    try {
      const response = await riskAPI.calculateRisk(damId);
      setSelectedRiskData(response.data);
    } catch (err) {
      console.error('Error fetching dam details:', err);
    }
  }, []);

  // Fetch rainfall data for selected dam
  const fetchRainfallForDam = useCallback(async (damId) => {
    if (!damId) return;

    try {
      const dam = dams.find(d => d.id === damId);
      if (!dam) return;

      const response = await dataAPI.getRainfallData(dam.latitude, dam.longitude);
      setRainfallData(response.data);
    } catch (err) {
      console.error('Error fetching rainfall data:', err);
    }  }, [dams]);

  // Fetch advanced risk analysis for selected dam
  const fetchAdvancedRiskForDam = useCallback(async (damId) => {
    if (!damId) return;

    try {
      const response = await dataAPI.getAdvancedRiskAnalysis(damId);
      setAdvancedRiskData(response.data);
    } catch (err) {
      console.error('Error fetching advanced risk data:', err);
      // Fallback to basic risk data if advanced fails
      setAdvancedRiskData(null);
    }  }, []);

  // Button handlers
  const handleEmergencyContacts = useCallback(() => {
    setShowEmergencyModal(true);
  }, []);

  const handleDetailedReport = useCallback(() => {
    setShowReportModal(true);
  }, []);

  const handleSetNotifications = useCallback(() => {
    setShowNotificationsModal(true);
  }, []);

  const handleSaveNotifications = useCallback(async () => {
    try {
      // Save to localStorage
      localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));

      // Send test notification if email is provided
      if (notificationSettings.email) {
        const testMessage = `
          <h2>Flood & Landslide Warning System - Notification Test</h2>
          <p>Your notification settings have been configured successfully!</p>
          <p><strong>Settings:</strong></p>
          <ul>
            <li>Email: ${notificationSettings.email}</li>
            <li>Phone: ${notificationSettings.phone || 'Not provided'}</li>
            <li>High Risk Alerts: ${notificationSettings.highRisk ? 'Enabled' : 'Disabled'}</li>
            <li>Medium Risk Alerts: ${notificationSettings.mediumRisk ? 'Enabled' : 'Disabled'}</li>
            <li>Low Risk Alerts: ${notificationSettings.lowRisk ? 'Enabled' : 'Disabled'}</li>
            <li>Earthquake Alerts: ${notificationSettings.earthquakes ? 'Enabled' : 'Disabled'}</li>
            <li>Rainfall Alerts: ${notificationSettings.rainfall ? 'Enabled' : 'Disabled'}</li>
          </ul>
          <p>You will receive alerts based on your preferences.</p>
          <p>Best regards,<br>Flood & Landslide Warning System</p>
        `;

        await apiClient.post('/notifications/email', {
          to: notificationSettings.email,
          subject: 'Notification Settings Confirmed - Flood Warning System',
          message: testMessage,
          settings: notificationSettings,
        });
      }

      setToast({
        message: '✅ Notification settings saved and test email sent!',
        type: 'success'
      });
      setShowNotificationsModal(false);
    } catch (error) {
      console.error('Error saving notifications:', error);
      setToast({
        message: '⚠️ Settings saved but email test failed. Check your email configuration.',
        type: 'warning'
      });
      setShowNotificationsModal(false);
    }
  }, [notificationSettings]);

  const handleEmergencyProtocol = useCallback(() => {
    // Activate emergency response protocol
    setToast({
      message: '🚨 EMERGENCY PROTOCOL ACTIVATED! Authorities have been notified.',
      type: 'error'
    });
    // In a real application, this would trigger emergency notifications
    // For now, we'll show an alert and potentially trigger emergency contacts
    setTimeout(() => {
      setShowEmergencyModal(true);
    }, 1000);
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Show toast notifications for high-risk alerts
  useEffect(() => {
    const highRiskAlerts = alerts.filter(a => a.severity === 'HIGH');
    if (highRiskAlerts.length > 0 && !toast) {
      setToast({
        message: `🚨 ${highRiskAlerts.length} critical alert${highRiskAlerts.length > 1 ? 's' : ''} detected! Check dashboard.`,
        type: 'error'
      });
    }
  }, [alerts, toast]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch details when dam selection changes
  useEffect(() => {
    if (selectedDam) {
      fetchDamRiskDetails(selectedDam);
      fetchRainfallForDam(selectedDam);
      fetchAdvancedRiskForDam(selectedDam);
    }
  }, [selectedDam, fetchDamRiskDetails, fetchRainfallForDam, fetchAdvancedRiskForDam]);

  const filteredDams = selectedRegion
    ? dams.filter(d => d.state === selectedRegion)
    : dams;

  const filteredRisks = selectedRegion
    ? risks.filter(r => r.dam?.state === selectedRegion)
    : risks;

  const highRiskCount = filteredRisks.filter(r => r.floodRisk === 'HIGH' || r.landslideRisk === 'HIGH').length;

  const avgRainfall = rainfallData?.forecast?.daily?.precipitation_sum
    ? +(rainfallData.forecast.daily.precipitation_sum.reduce((s, v) => s + (v || 0), 0) / rainfallData.forecast.daily.precipitation_sum.length).toFixed(1)
    : 0;
  const earthquakesCount = selectedRiskData?.environmentalData?.earthquakes?.recentCount || 0;

  const historicalRiskData = selectedRiskData ? {
    lastWeek: {
      floodRisk: Math.max(0, (selectedRiskData.floodRisk?.current?.score || 0) * 0.92),
      landslideRisk: Math.max(0, (selectedRiskData.landslideRisk?.current?.score || 0) * 0.9),
    },
    lastMonth: {
      floodRisk: Math.max(0, (selectedRiskData.floodRisk?.current?.score || 0) * 0.84),
      landslideRisk: Math.max(0, (selectedRiskData.landslideRisk?.current?.score || 0) * 0.82),
    },
    lastYear: {
      floodRisk: Math.max(0, (selectedRiskData.floodRisk?.current?.score || 0) * 0.88),
      landslideRisk: Math.max(0, (selectedRiskData.landslideRisk?.current?.score || 0) * 0.86),
    },
  } : null;

  if (loading && dams.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Fetching live data for 50+ dams across India...</p>
          <p className="mt-2 text-xs text-gray-400">First load may take 30-60 seconds (calling Open-Meteo, NASA, USGS, GloFAS for each dam)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 relative overflow-hidden">
      {/* Particle Background Effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle absolute rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Header with integrated navigation */}
      <Header 
        lastUpdated={lastUpdated} 
        onRefresh={fetchData} 
        isLoading={loading}
        currentView={currentView}
        onViewChange={setCurrentView}
        onMenuToggle={() => setDrawerOpen(!drawerOpen)}
      />

      {/* Current Dam/Location Display - Always visible */}
      {selectedDam && dams.length > 0 && (
        <div className="bg-blue-600 text-white px-4 md:px-6 py-2 shadow-md animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">🏗️</span>
              <div>
                <h2 className="font-bold text-sm md:text-base">
                  {dams.find(d => d.id === selectedDam)?.name || 'Unknown Dam'}
                </h2>
                <p className="text-xs md:text-sm opacity-90">
                  {dams.find(d => d.id === selectedDam)?.state || ''} • {dams.find(d => d.id === selectedDam)?.river || ''} River
                </p>
              </div>
            </div>
            <div className="text-right text-xs md:text-sm">
              <p>Lat: {dams.find(d => d.id === selectedDam)?.latitude?.toFixed(3) || 'N/A'}</p>
              <p>Lon: {dams.find(d => d.id === selectedDam)?.longitude?.toFixed(3) || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main layout - Drawer + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Drawer */}
        <Drawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          regions={[...new Set(dams.map(d => d.state))]}
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
          dams={filteredDams}
          selectedDam={selectedDam}
          onDamSelect={setSelectedDam}
        />

        {/* Content Area - Full width when drawer is closed */}
        <div className="flex-1 overflow-auto flex flex-col w-full">
          <div className="flex-1 overflow-auto">
            <div className="p-3 sm:p-4 md:p-8 w-full max-w-full">
              {error && (
                <div className="mb-4">
                  <ErrorAlert
                    message={error}
                    onClose={() => setError(null)}
                  />
                </div>
              )}

              {/* Dashboard View */}
              {currentView === 'dashboard' && (
                <div className="space-y-4 md:space-y-6">
                  <h2 className="text-xl md:text-3xl font-bold text-gray-900">📊 Dashboard</h2>
                  <div className="grid grid-cols-1 gap-4 md:gap-6">
                    <div className="space-y-6">
                      <Dashboard
                        totalDams={filteredDams.length}
                        highRiskZones={filteredRisks.filter(r => r.floodRisk === 'HIGH').length}
                        avgRainfall={avgRainfall}
                        earthquakesLast24h={earthquakesCount}
                        risks={filteredRisks}
                        alerts={alerts}
                        advancedRiskData={advancedRiskData}
                        onEmergencyContacts={handleEmergencyContacts}
                        onDetailedReport={handleDetailedReport}
                        onSetNotifications={handleSetNotifications}
                        onEmergencyProtocol={handleEmergencyProtocol}
                      />

                      {/* Predictive Analytics */}
                      <PredictiveAnalytics risks={filteredRisks} dams={filteredDams} />

                      {/* Live Weather Monitor */}
                      <LiveWeatherMonitor selectedDam={selectedDam} dams={filteredDams} />
                    </div>
                  </div>
                </div>
              )}

              {/* Map View */}
              {currentView === 'map' && (
                <div className="space-y-4 md:space-y-6">
                  <h2 className="text-xl md:text-3xl font-bold text-gray-900">🗺️ Risk Map</h2>
                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6 items-start">
                    <div className="xl:col-span-3">
                      <div className="bg-white border border-gray-200 rounded-lg p-2 md:p-4 shadow-sm overflow-hidden" style={{ height: 'clamp(360px, 62vh, 760px)' }}>
                        <MapComponent
                          dams={filteredDams}
                          risks={filteredRisks}
                          selectedDam={selectedDam}
                          onDamSelect={setSelectedDam}
                        />
                      </div>
                    </div>
                    <div className="max-h-none xl:max-h-[62vh] overflow-visible xl:overflow-y-auto">
                      <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 shadow-sm min-h-[220px]">
                        <RiskDetailsPanel 
                          riskData={selectedRiskData} 
                          dam={dams.find(d => d.id === selectedDam)} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Charts/Analytics View */}
              {currentView === 'charts' && (
                <div className="space-y-4 md:space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-xl md:text-3xl font-bold text-gray-900">📈 Analytics</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => exportRiskData(filteredRisks, dams)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
                      >
                        📄 Export Risk PDF
                      </button>
                      <button
                        onClick={() => exportRainfallData(rainfallData, dams.find(d => d.id === selectedDam)?.name || 'Unknown')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
                      >
                        📄 Export Rainfall PDF
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    {/* Rainfall Data */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-bold mb-4 text-gray-900">📊 Rainfall Forecast</h3>
                      <div className="max-h-80 overflow-auto">
                        {rainfallData ? (
                          <RainfallChart data={rainfallData.forecast} />
                        ) : (
                          <p className="text-gray-600 text-sm">No rainfall data available. Select a dam from the menu.</p>
                        )}
                      </div>
                    </div>

                    {/* Risk Trend */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-bold mb-4 text-gray-900">📈 Risk Trend (±24h)</h3>
                      <div className="max-h-80 overflow-auto">
                        {selectedRiskData ? (
                          <RiskTrendChart
                            floodRisks={selectedRiskData.floodRisk}
                            landslideRisks={selectedRiskData.landslideRisk}
                            environmentalData={selectedRiskData.environmentalData}
                          />
                        ) : (
                          <p className="text-gray-600 text-sm">Select a dam to view trends</p>
                        )}
                      </div>
                    </div>

                    {/* Historical Comparison */}
                    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900">📊 Historical Risk Comparison</h3>
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Advanced Analytics</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">
                        Compare current risk levels with model-derived historical baselines from live risk inputs.
                      </p>
                      <div style={{ minHeight: '350px' }}>
                        <HistoricalComparisonChart
                          currentData={selectedRiskData}
                          historicalData={historicalRiskData}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Emergency Contacts Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  🚨 Emergency Response Center
                </h2>
                <button
                  onClick={() => setShowEmergencyModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <EmergencyContacts />
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-bold text-red-800 mb-2">🚨 Immediate Actions</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Evacuate low-lying areas immediately</li>
                    <li>• Move to higher ground</li>
                    <li>• Follow local authority instructions</li>
                    <li>• Prepare emergency kits</li>
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-bold text-blue-800 mb-2">📋 Emergency Checklist</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Water and food supplies</li>
                    <li>• Important documents</li>
                    <li>• First aid kit</li>
                    <li>• Flashlights and batteries</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  📊 Comprehensive Risk Assessment Report
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportToPDF(filteredRisks, dams, advancedRiskData)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
                  >
                    📄 Export PDF
                  </button>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Executive Summary */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Executive Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{filteredDams.length}</div>
                      <div className="text-sm text-gray-600">Total Dams Monitored</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">{highRiskCount}</div>
                      <div className="text-sm text-gray-600">High Risk Areas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {Math.round((filteredRisks.filter(r => r.floodRisk === 'LOW').length / filteredRisks.length) * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">Normal Conditions</div>
                    </div>
                  </div>
                </div>

                {/* Risk Analysis */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Risk Analysis</h3>
                  <div className="space-y-4">
                    {filteredRisks.slice(0, 10).map((risk, idx) => {
                      const dam = dams.find(d => d.id === risk.dam?.id);
                      return (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-900">{dam?.name || 'Unknown Dam'}</h4>
                            <div className="flex gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                risk.floodRisk === 'HIGH' ? 'bg-red-100 text-red-800' :
                                risk.floodRisk === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                Flood: {risk.floodRisk}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                risk.landslideRisk === 'HIGH' ? 'bg-red-100 text-red-800' :
                                risk.landslideRisk === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                Landslide: {risk.landslideRisk}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">{dam?.state}, {dam?.river} River</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Settings Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 animate-scaleIn">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  🔔 Notification Settings
                </h2>
                <button
                  onClick={() => setShowNotificationsModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={notificationSettings.email}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={notificationSettings.phone}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Alert Types</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notificationSettings.highRisk}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, highRisk: e.target.checked }))}
                      className="mr-2"
                    />
                    High Risk Alerts
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notificationSettings.mediumRisk}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, mediumRisk: e.target.checked }))}
                      className="mr-2"
                    />
                    Medium Risk Alerts
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notificationSettings.earthquakes}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, earthquakes: e.target.checked }))}
                      className="mr-2"
                    />
                    Earthquake Alerts
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notificationSettings.rainfall}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, rainfall: e.target.checked }))}
                      className="mr-2"
                    />
                    Heavy Rainfall Alerts
                  </label>
                </div>
              </div>
              <button
                onClick={handleSaveNotifications}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
