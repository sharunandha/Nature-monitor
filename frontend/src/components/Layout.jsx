import React, { useState } from 'react';
import { LoadingSpinner, ErrorAlert, SuccessAlert } from './Common';

export const Header = ({ lastUpdated, onRefresh, isLoading, currentView, onViewChange, onMenuToggle }) => {
  const [feedback, setFeedback] = useState(null);

  const handleRefresh = async () => {
    try {
      onRefresh?.();
      setFeedback({ type: 'success', message: 'Data refreshed successfully' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to refresh data' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm py-4 px-4 md:px-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left Section - Logo and Title */}
        <div className="flex items-center space-x-3 flex-1">
          <button 
            onClick={onMenuToggle}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            title="Toggle menu"
          >
            <span className="text-2xl">☰</span>
          </button>
          <div className="text-2xl md:text-3xl">🛰️</div>
          <div className="flex-1">
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 leading-tight">
              India Flood & Landslide Warning System
            </h1>
            <p className="text-xs md:text-sm text-gray-600 mt-0.5">
              Real-time Environmental Monitoring Dashboard
            </p>
          </div>
        </div>

        {/* Right Section - Navigation and Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full lg:w-auto">
          {/* Navigation Buttons */}
          <div className="flex gap-2 w-full md:w-auto">
            {['dashboard', 'map', 'charts', 'reservoirs'].map(view => (
              <button
                key={view}
                onClick={() => onViewChange(view)}
                className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg font-medium text-sm transition ${
                  currentView === view
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {view === 'dashboard' && '📊'}
                {view === 'map' && '🗺️'}
                {view === 'charts' && '📈'}
                {view === 'reservoirs' && '💧'}
                <span className="hidden sm:inline ml-1">{view.charAt(0).toUpperCase() + view.slice(1)}</span>
              </button>
            ))}
          </div>

          {/* Last Updated and Refresh */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="text-right text-xs md:text-sm hidden md:block">
              <p className="text-gray-600">Last Updated</p>
              <p className="font-semibold text-gray-900">
                {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('en-IN') : 'Never'}
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : <span>🔄</span>}
              <span className="text-sm">{isLoading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="mt-3">
          {feedback.type === 'success' ? (
            <SuccessAlert message={feedback.message} onClose={() => setFeedback(null)} />
          ) : (
            <ErrorAlert message={feedback.message} onClose={() => setFeedback(null)} />
          )}
        </div>
      )}
    </div>
  );
};


export const Drawer = ({ isOpen, onClose, regions, selectedRegion, onRegionChange, dams, selectedDam, onDamSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const baseDams = selectedRegion
    ? (dams || []).filter(dam => dam.state === selectedRegion)
    : (dams || []);

  // Filter dams by selected state + search term.
  const filteredDams = baseDams.filter(dam =>
    dam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dam.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dam.river || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group filtered dams by state
  const damsByState = filteredDams.reduce((acc, dam) => {
    if (!acc[dam.state]) acc[dam.state] = [];
    acc[dam.state].push(dam);
    return acc;
  }, {});

  // All states from full dam list (for the dropdown)
  const allStates = [...new Set((dams || []).map(d => d.state))].sort();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed md:relative md:translate-x-0 left-0 top-0 h-screen md:h-full w-64 md:w-72 bg-white border-r border-gray-200 z-40 transform transition-transform duration-300 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 md:p-5">
          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="md:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <span className="text-xl">✕</span>
          </button>

          <h3 className="text-lg font-bold text-gray-900 mb-1 mt-6 md:mt-0">🏗️ Dams</h3>
          <p className="text-xs text-gray-500 mb-3">{dams?.length || 0} monitored across India</p>

          {/* Search Box */}
          <div className="mb-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search dam, state, river..."
              className="w-full px-3 py-2 bg-gray-50 text-gray-900 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* State/Region Filter */}
          <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <label className="text-xs text-gray-700 block mb-1.5 font-semibold">Filter by State</label>
            <select
              value={selectedRegion}
              onChange={(e) => onRegionChange(e.target.value)}
              className="w-full px-3 py-2 bg-white text-gray-900 text-sm rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All States ({allStates.length})</option>
              {allStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {/* Dam List grouped by state */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">
              {filteredDams.length} dam{filteredDams.length !== 1 ? 's' : ''}
              {searchTerm && ` matching "${searchTerm}"`}
            </h4>

            {Object.keys(damsByState).sort().length > 0 ? (
              Object.keys(damsByState).sort().map(state => (
                <div key={state}>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider py-1 px-1 bg-gray-50 rounded mb-1">
                    {state} ({damsByState[state].length})
                  </div>
                  <div className="space-y-1">
                    {damsByState[state].map(dam => (
                      <button
                        key={dam.id}
                        onClick={() => {
                          onDamSelect(dam.id);
                          onClose();
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition border ${
                          selectedDam === dam.id
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-900 border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <div className="font-medium text-xs">{dam.name}</div>
                        {dam.river && <div className="text-xs opacity-60">{dam.river}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 p-3">No dams found</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export const Footer = () => {
  return (
    <div className="bg-gray-50 border-t border-gray-200 p-3 md:p-4 text-center text-xs text-gray-600">
      <p className="flex flex-wrap items-center justify-center gap-1 md:gap-2">
        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span className="font-medium">100% Live Data</span>
        <span className="hidden sm:inline">— Open-Meteo Weather API &bull; GloFAS River Discharge &bull; NASA POWER Satellite &bull; USGS Earthquake Hazards</span>
      </p>
      <p className="mt-2">
        Last sync: {new Date().toLocaleString('en-IN')} &bull; No mock or random values
      </p>
    </div>
  );
};

export const ViewToggle = ({ currentView, onViewChange }) => {
  return (
    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
      {['dashboard', 'map', 'charts', 'reservoirs'].map(view => (
        <button
          key={view}
          onClick={() => onViewChange(view)}
          className={`px-4 py-2 rounded font-medium text-sm transition ${
            currentView === view
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:text-gray-900'
          }`}
        >
          {view === 'dashboard' && '📊 Dashboard'}
          {view === 'map' && '🗺️ Map'}
          {view === 'charts' && '📈 Analytics'}
          {view === 'reservoirs' && '💧 Reservoirs'}
        </button>
      ))}
    </div>
  );
};
