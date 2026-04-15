import React from 'react';
import { InfoCard } from './Common';
import { StateReservoirSummaryChart } from './Charts';
import { dataAPI } from '../services/api';

export const EmergencyContacts = () => {
  const contacts = [
    { name: 'National Disaster Management Authority', number: '1078', type: 'National' },
    { name: 'State Disaster Management', number: '1077', type: 'State' },
    { name: 'Fire Services', number: '101', type: 'Emergency' },
    { name: 'Police', number: '100', type: 'Emergency' },
    { name: 'Ambulance', number: '108', type: 'Medical' },
    { name: 'Central Water Commission', number: '+91-11-2610-6666', type: 'Technical' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm animate-scaleIn">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        📞 Emergency Contacts
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {contacts.map((contact, idx) => (
          <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition hover-lift">
            <div>
              <p className="font-medium text-gray-900">{contact.name}</p>
              <p className="text-sm text-gray-600">{contact.type}</p>
            </div>
            <a
              href={`tel:${contact.number}`}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition animate-glow"
            >
              {contact.number}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export const RealTimeAlerts = ({ alerts, onEmergencyProtocol }) => {
  const criticalAlerts = alerts?.filter(a => a.severity === 'HIGH') || [];
  const recentAlerts = alerts?.slice(0, 5) || [];

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg p-4 md:p-6 shadow-sm animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          🚨 Real-Time Alert System
          <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
        </h3>
        <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
          Live Updates
        </div>
      </div>

      {criticalAlerts.length > 0 && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg animate-bounce">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600 font-bold">⚠️ CRITICAL ALERT</span>
            <span className="text-red-800 text-sm">{criticalAlerts.length} active</span>
          </div>
          <button
            onClick={onEmergencyProtocol}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition animate-glow"
          >
            🚨 Activate Emergency Protocol
          </button>
        </div>
      )}

      <div className="space-y-3">
        {recentAlerts.map((alert, idx) => (
          <div key={idx} className={`p-3 rounded-lg border transition-all hover-lift ${
            alert.severity === 'HIGH' ? 'bg-red-50 border-red-200' :
            alert.severity === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
            'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    alert.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="text-xs text-gray-500">{alert.timestamp}</span>
                </div>
                <p className="font-medium text-gray-900">{alert.title || 'Alert'}</p>
                <p className="text-sm text-gray-600 mt-1">{alert.description || ''}</p>
              </div>
              <div className={`text-2xl ${
                alert.severity === 'HIGH' ? 'animate-bounce' : ''
              }`}>
                {alert.severity === 'HIGH' ? '🚨' : alert.severity === 'MEDIUM' ? '⚠️' : 'ℹ️'}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            System Active
          </span>
        </div>
      </div>
    </div>
  );
};

export const Dashboard = ({
  totalDams,
  highRiskZones,
  avgRainfall,
  earthquakesLast24h,
  risks,
  alerts,
  advancedRiskData,
  reservoirStates = [],
  onEmergencyContacts,
  onDetailedReport,
  onSetNotifications,
  onEmergencyProtocol
}) => {
  const highRiskCount = risks?.filter(r => r.floodRisk === 'HIGH' || r.landslideRisk === 'HIGH').length || 0;
  const criticalHighReservoirs = risks?.filter(r => Number(r.environmentalSummary?.reservoirLevel || 0) >= 85).length || 0;
  const criticalLowReservoirs = risks?.filter(r => Number(r.environmentalSummary?.reservoirLevel || 0) < 20).length || 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Live Data Badge */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 animate-pulse animate-float glass">
        <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
        <span className="text-sm font-medium text-green-800">Live Data</span>
        <span className="text-xs text-green-600 ml-2">Open-Meteo &bull; NASA POWER &bull; USGS &bull; GloFAS &bull; WeatherAPI &bull; Sentinel Hub</span>
      </div>

      {/* Advanced Risk Analysis */}
      {advancedRiskData && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 md:p-6 shadow-sm animate-slideIn">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            🧠 Advanced AI Risk Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
              <h4 className="font-bold text-blue-700 mb-2">Overall Risk Score</h4>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {advancedRiskData.overallRisk?.score || 0}
              </div>
              <div className={`text-sm font-medium px-2 py-1 rounded inline-block ${
                advancedRiskData.overallRisk?.level === 'HIGH' ? 'bg-red-100 text-red-800' :
                advancedRiskData.overallRisk?.level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {advancedRiskData.overallRisk?.level || 'LOW'} RISK
              </div>
            </div>
            <div className="bg-white border border-red-200 rounded-lg p-4 shadow-sm">
              <h4 className="font-bold text-red-700 mb-2">Flood Risk</h4>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {advancedRiskData.floodRisk?.score || 0}
              </div>
              <div className="text-xs text-gray-600">
                {advancedRiskData.floodRisk?.factors?.slice(0, 2).join(', ') || 'No factors'}
              </div>
            </div>
            <div className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm">
              <h4 className="font-bold text-orange-700 mb-2">Landslide Risk</h4>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {advancedRiskData.landslideRisk?.score || 0}
              </div>
              <div className="text-xs text-gray-600">
                {advancedRiskData.landslideRisk?.factors?.slice(0, 2).join(', ') || 'No factors'}
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-600">
            <strong>Data Sources:</strong> {advancedRiskData.dataSources?.join(' • ') || 'Multiple APIs'}
            <br />
            <strong>Confidence:</strong> {advancedRiskData.confidence || 0}% • <strong>Last Updated:</strong> {new Date(advancedRiskData.timestamp).toLocaleString()}
          </div>
        </div>
      )}

      {/* High Risk Areas for Next 24 Hours */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4 md:p-6 shadow-sm animate-slideIn">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          🚨 High Risk Areas - Next 24 Hours
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Areas requiring immediate attention based on current environmental conditions, rainfall forecasts, and risk assessments.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Flood Risk Areas */}
          <div className="bg-white border border-red-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2">
              🌊 Flood Risk Areas
            </h4>
            <div className="space-y-2">
              {risks?.filter(r => r.floodRisk === 'HIGH').slice(0, 3).map((risk, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{risk.dam?.name || 'Unknown'}</span>
                  <span className="text-red-600 font-bold">{risk.floodScore || 0}</span>
                </div>
              ))}
              {(!risks || risks.filter(r => r.floodRisk === 'HIGH').length === 0) && (
                <p className="text-gray-500 text-sm">No high flood risk areas currently</p>
              )}
            </div>
          </div>

          {/* Landslide Risk Areas */}
          <div className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-bold text-orange-700 mb-2 flex items-center gap-2">
              🏔️ Landslide Risk Areas
            </h4>
            <div className="space-y-2">
              {risks?.filter(r => r.landslideRisk === 'HIGH').slice(0, 3).map((risk, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{risk.dam?.name || 'Unknown'}</span>
                  <span className="text-orange-600 font-bold">{risk.landslideScore || 0}</span>
                </div>
              ))}
              {(!risks || risks.filter(r => r.landslideRisk === 'HIGH').length === 0) && (
                <p className="text-gray-500 text-sm">No high landslide risk areas currently</p>
              )}
            </div>
          </div>

          {/* Critical Alerts */}
          <div className="bg-white border border-yellow-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-bold text-yellow-700 mb-2 flex items-center gap-2">
              ⚡ Critical Alerts
            </h4>
            <div className="space-y-2">
              {alerts?.filter(a => a.severity === 'HIGH').slice(0, 3).map((alert, idx) => (
                <div key={idx} className="text-sm">
                  <p className="font-medium text-gray-900">{alert.title || 'Alert'}</p>
                  <p className="text-gray-600 text-xs">{alert.description?.substring(0, 50) || ''}...</p>
                </div>
              ))}
              {(!alerts || alerts.filter(a => a.severity === 'HIGH').length === 0) && (
                <p className="text-gray-500 text-sm">No critical alerts</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button 
            onClick={onEmergencyContacts}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition animate-bounce hover:animate-pulse transform hover:scale-105"
          >
            📞 Emergency Contacts
          </button>
          <button 
            onClick={onDetailedReport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition hover:animate-pulse transform hover:scale-105"
          >
            📊 Detailed Report
          </button>
          <button 
            onClick={onSetNotifications}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition hover:animate-pulse transform hover:scale-105"
          >
            🔔 Set Notifications
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <InfoCard
          icon="🗺️"
          title="Total Dams"
          value={totalDams}
          color="blue"
          className="animate-slideUp hover-lift animate-glow"
          style={{ animationDelay: '0.1s' }}
        />
        <InfoCard
          icon="⚠️"
          title="High Risk Zones"
          value={highRiskCount}
          color={highRiskCount > 0 ? 'red' : 'green'}
          className="animate-slideUp hover-lift animate-glow"
          style={{ animationDelay: '0.2s' }}
        />
        <InfoCard
          icon="🚨"
          title="Reservoirs Critical High"
          value={criticalHighReservoirs}
          color={criticalHighReservoirs > 0 ? 'red' : 'green'}
          className="animate-slideUp hover-lift animate-glow"
          style={{ animationDelay: '0.3s' }}
        />
        <InfoCard
          icon="🟠"
          title="Reservoirs Critical Low"
          value={criticalLowReservoirs}
          color={criticalLowReservoirs > 0 ? 'amber' : 'green'}
          className="animate-slideUp hover-lift animate-glow"
          style={{ animationDelay: '0.4s' }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <InfoCard
          icon="💧"
          title="Avg Rainfall"
          value={avgRainfall?.toFixed(1)}
          unit="mm"
          color="blue"
          className="animate-slideUp hover-lift animate-glow"
          style={{ animationDelay: '0.1s' }}
        />
        <InfoCard
          icon="📍"
          title="Earthquakes (30d)"
          value={earthquakesLast24h}
          color="amber"
          className="animate-slideUp hover-lift animate-glow"
          style={{ animationDelay: '0.2s' }}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900">State-wise Reservoir Summary</h3>
          <span className="text-xs text-gray-500">All dams grouped by state</span>
        </div>

        <div className="overflow-auto max-h-72">
          <table className="w-full text-sm min-w-[650px]">
            <thead>
              <tr className="text-left border-b border-gray-200 text-gray-600">
                <th className="py-2">State</th>
                <th className="py-2">Dams</th>
                <th className="py-2">Average % Full</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {reservoirStates.map((state) => {
                const avg = Number(state.avgFillPercent || 0);
                const status = avg >= 85 ? 'CRITICAL_HIGH' : avg >= 70 ? 'HIGH' : avg >= 40 ? 'NORMAL' : avg >= 20 ? 'LOW' : 'CRITICAL_LOW';
                const statusClass = status === 'CRITICAL_HIGH' ? 'bg-red-100 text-red-700' :
                  status === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                    status === 'NORMAL' ? 'bg-green-100 text-green-700' :
                      status === 'LOW' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700';

                return (
                  <tr key={state.name} className="border-b border-gray-100">
                    <td className="py-2 font-medium text-gray-900">{state.name}</td>
                    <td className="py-2 text-gray-700">{state.damCount}</td>
                    <td className="py-2 text-gray-700">{avg.toFixed(1)}%</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass}`}>{status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <StateReservoirSummaryChart states={reservoirStates} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">System Status Overview</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {risks && risks.length > 0 && (
            <>
              <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="text-2xl font-bold text-green-600">
                  {risks.filter(r => r.floodRisk === 'LOW').length}
                </p>
                <p className="text-xs text-green-700 mt-1 font-medium">Low Flood Risk</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-2xl font-bold text-amber-600">
                  {risks.filter(r => r.floodRisk === 'MEDIUM').length}
                </p>
                <p className="text-xs text-amber-700 mt-1 font-medium">Medium Flood Risk</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-2xl font-bold text-red-600">
                  {risks.filter(r => r.floodRisk === 'HIGH').length}
                </p>
                <p className="text-xs text-red-700 mt-1 font-medium">High Flood Risk</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Alert Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Alert Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-3xl font-bold text-red-600">
              {alerts?.filter(a => a.severity === 'HIGH').length || 0}
            </p>
            <p className="text-sm text-red-700 mt-1 font-medium">Critical Alerts</p>
          </div>
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-3xl font-bold text-amber-600">
              {alerts?.filter(a => a.severity === 'MEDIUM').length || 0}
            </p>
            <p className="text-sm text-amber-700 mt-1 font-medium">Warning Alerts</p>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-3xl font-bold text-blue-600">
              {alerts?.filter(a => a.severity !== 'HIGH' && a.severity !== 'MEDIUM').length || 0}
            </p>
            <p className="text-sm text-blue-700 mt-1 font-medium">Info Alerts</p>
          </div>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Risk by Type</h3>
        
        <div className="space-y-4">
          {/* Flood Risk */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Flood Risk</span>
              <span className="text-xs text-gray-500">
                {risks?.filter(r => r.floodRisk === 'HIGH').length} High · {risks?.filter(r => r.floodRisk === 'MEDIUM').length} Med · {risks?.filter(r => r.floodRisk === 'LOW').length} Low
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 flex overflow-hidden">
              {risks?.length > 0 && (
                <>
                  <div
                    className="bg-red-500 h-3 transition-all"
                    style={{ width: `${(risks.filter(r => r.floodRisk === 'HIGH').length / risks.length) * 100}%` }}
                  ></div>
                  <div
                    className="bg-amber-400 h-3 transition-all"
                    style={{ width: `${(risks.filter(r => r.floodRisk === 'MEDIUM').length / risks.length) * 100}%` }}
                  ></div>
                  <div
                    className="bg-green-500 h-3 transition-all"
                    style={{ width: `${(risks.filter(r => r.floodRisk === 'LOW').length / risks.length) * 100}%` }}
                  ></div>
                </>
              )}
            </div>
          </div>

          {/* Landslide Risk */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Landslide Risk</span>
              <span className="text-xs text-gray-500">
                {risks?.filter(r => r.landslideRisk === 'HIGH').length} High · {risks?.filter(r => r.landslideRisk === 'MEDIUM').length} Med · {risks?.filter(r => r.landslideRisk === 'LOW').length} Low
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 flex overflow-hidden">
              {risks?.length > 0 && (
                <>
                  <div
                    className="bg-red-500 h-3 transition-all"
                    style={{ width: `${(risks.filter(r => r.landslideRisk === 'HIGH').length / risks.length) * 100}%` }}
                  ></div>
                  <div
                    className="bg-amber-400 h-3 transition-all"
                    style={{ width: `${(risks.filter(r => r.landslideRisk === 'MEDIUM').length / risks.length) * 100}%` }}
                  ></div>
                  <div
                    className="bg-green-500 h-3 transition-all"
                    style={{ width: `${(risks.filter(r => r.landslideRisk === 'LOW').length / risks.length) * 100}%` }}
                  ></div>
                </>
              )}
            </div>
          </div>

          {/* Average Risk Scores */}
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xl font-bold text-blue-700">
                {risks?.length > 0 ? (risks.reduce((s, r) => s + (r.floodScore || 0), 0) / risks.length).toFixed(0) : 0}
              </p>
              <p className="text-xs text-blue-600 mt-1">Avg Flood Score</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-orange-50 border border-orange-200">
              <p className="text-xl font-bold text-orange-700">
                {risks?.length > 0 ? (risks.reduce((s, r) => s + (r.landslideScore || 0), 0) / risks.length).toFixed(0) : 0}
              </p>
              <p className="text-xs text-orange-600 mt-1">Avg Landslide Score</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mt-1">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block"></span> High (&gt;60)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block"></span> Medium (30-60)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block"></span> Low (&lt;30)</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export const PredictiveAnalytics = ({ risks, dams }) => {
  const highRiskDams = risks?.filter(r => r.floodRisk === 'HIGH' || r.landslideRisk === 'HIGH') || [];
  const predictedImpacts = highRiskDams.map(risk => {
    const dam = dams.find(d => d.id === risk.dam?.id);
    const riskScore = Math.max(risk.floodScore || 0, risk.landslideScore || 0);
    const capacity = Number(dam?.capacity || 0);
    const estimatedPopulation = Math.round((capacity * 900) + (riskScore * 180) + 8500);
    const estimatedEconomicValue = Math.round((capacity * 2.2) + (riskScore * 1.1) + 95);
    const evacuationTime = Math.max(4, Math.min(36, Math.round((riskScore / 4) + 6)));

    return {
      damName: dam?.name || 'Unknown',
      population: estimatedPopulation,
      economicValue: estimatedEconomicValue,
      riskScore,
      predictedImpact: risk.floodRisk === 'HIGH' ? 'Flooding' : 'Landslide',
      evacuationTime,
    };
  });

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 md:p-6 shadow-sm animate-fadeIn">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        🔮 Predictive Impact Analysis
        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">AI-Powered</span>
      </h3>

      <div className="space-y-4">
        {predictedImpacts.length > 0 ? (
          predictedImpacts.map((impact, idx) => (
            <div key={idx} className="bg-white border border-purple-200 rounded-lg p-4 hover-lift transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-gray-900">{impact.damName}</h4>
                  <p className="text-sm text-gray-600">{impact.predictedImpact} Risk</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-600">{impact.riskScore}/100</div>
                  <div className="text-xs text-gray-500">Risk Score</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-blue-600">{impact.population.toLocaleString()}</div>
                  <div className="text-gray-600">Affected Population</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-green-600">₹{impact.economicValue}Cr</div>
                  <div className="text-gray-600">Economic Value</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-orange-600">{impact.evacuationTime}h</div>
                  <div className="text-gray-600">Evacuation Time</div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Predicted Impact Zone</span>
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded">High Priority</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-gray-600">No high-risk scenarios predicted</p>
            <p className="text-sm text-gray-500 mt-1">All monitored areas are within safe parameters</p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-purple-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Analysis based on current environmental data</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
            Live Analysis
          </span>
        </div>
      </div>
    </div>
  );
};

export const LiveWeatherMonitor = ({ selectedDam, dams }) => {
  const dam = dams.find(d => d.id === selectedDam);
  const [weatherData, setWeatherData] = React.useState(null);
  const [weatherLoading, setWeatherLoading] = React.useState(false);
  const [weatherError, setWeatherError] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    const fetchWeather = async () => {
      if (!dam) return;

      try {
        setWeatherLoading(true);
        setWeatherError(null);

        const response = await dataAPI.getLiveWeather(dam.latitude, dam.longitude);
        const current = response?.data?.current;

        if (mounted && current) {
          setWeatherData(current);
        }
      } catch (error) {
        if (mounted) {
          setWeatherError('Unable to fetch live weather right now.');
        }
      } finally {
        if (mounted) {
          setWeatherLoading(false);
        }
      }
    };

    fetchWeather();

    // Refresh every 5 minutes for near-real-time updates.
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [dam]);

  if (!dam) {
    return (
      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4 md:p-6 shadow-sm animate-fadeIn">
        <h3 className="text-lg font-bold text-gray-900 mb-4">🌤️ Live Weather Monitor</h3>
        <p className="text-gray-600">Select a dam to view live weather conditions</p>
      </div>
    );
  }

  if (weatherLoading && !weatherData) {
    return (
      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4 md:p-6 shadow-sm animate-fadeIn">
        <h3 className="text-lg font-bold text-gray-900 mb-4">🌤️ Live Weather Monitor</h3>
        <p className="text-gray-600">Loading live weather data...</p>
      </div>
    );
  }

  if (weatherError && !weatherData) {
    return (
      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4 md:p-6 shadow-sm animate-fadeIn">
        <h3 className="text-lg font-bold text-gray-900 mb-4">🌤️ Live Weather Monitor</h3>
        <p className="text-red-600">{weatherError}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4 md:p-6 shadow-sm animate-fadeIn">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        🌤️ Live Weather Monitor
        <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded">Real-time</span>
      </h3>

      <div className="mb-4">
        <h4 className="font-semibold text-gray-900">{dam.name}</h4>
        <p className="text-sm text-gray-600">{dam.state}, {dam.river} River</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-3 text-center border border-cyan-200 hover-lift">
          <div className="text-2xl mb-1">🌡️</div>
          <div className="text-lg font-bold text-cyan-600">{weatherData?.temperature ?? '--'}°C</div>
          <div className="text-xs text-gray-600">Temperature</div>
        </div>

        <div className="bg-white rounded-lg p-3 text-center border border-cyan-200 hover-lift">
          <div className="text-2xl mb-1">💧</div>
          <div className="text-lg font-bold text-blue-600">{weatherData?.humidity ?? '--'}%</div>
          <div className="text-xs text-gray-600">Humidity</div>
        </div>

        <div className="bg-white rounded-lg p-3 text-center border border-cyan-200 hover-lift">
          <div className="text-2xl mb-1">💨</div>
          <div className="text-lg font-bold text-gray-600">{weatherData?.windSpeed ?? '--'} km/h</div>
          <div className="text-xs text-gray-600">Wind Speed</div>
        </div>

        <div className="bg-white rounded-lg p-3 text-center border border-cyan-200 hover-lift">
          <div className="text-2xl mb-1">📊</div>
          <div className="text-lg font-bold text-purple-600">{weatherData?.pressure ?? '--'}</div>
          <div className="text-xs text-gray-600">Pressure (mb)</div>
        </div>

        <div className="bg-white rounded-lg p-3 text-center border border-cyan-200 hover-lift">
          <div className="text-2xl mb-1">🌧️</div>
          <div className="text-lg font-bold text-blue-600">{weatherData?.rainfall ?? 0} mm</div>
          <div className="text-xs text-gray-600">Rainfall</div>
        </div>

        <div className="bg-white rounded-lg p-3 text-center border border-cyan-200 hover-lift">
          <div className="text-2xl mb-1">
            {String(weatherData?.condition || '').toLowerCase().includes('clear') || String(weatherData?.condition || '').toLowerCase().includes('sun') ? '☀️' :
             String(weatherData?.condition || '').toLowerCase().includes('cloud') ? '☁️' :
             String(weatherData?.condition || '').toLowerCase().includes('rain') ? '🌧️' : '⛈️'}
          </div>
          <div className="text-lg font-bold text-gray-600">{weatherData?.condition || 'Unknown'}</div>
          <div className="text-xs text-gray-600">Condition</div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-cyan-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live Data
          </span>
        </div>
      </div>
    </div>
  );
};
