import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getColorByRiskLevel } from '../utils/helpers';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const MapComponent = ({ dams, risks, selectedDam, onDamSelect }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({});
  const legendRef = useRef(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    if (!map.current) {
      map.current = L.map(mapContainer.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        dragging: true,
        tap: true,
      }).setView([20.5937, 78.9629], 4);

      L.control.zoom({ position: 'topright' }).addTo(map.current);

      // Use satellite tile layer
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18,
      }).addTo(map.current);

      // Add legend control
      const legend = L.control({ position: 'topright' });
      legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'info legend map-legend-compact bg-white p-2 rounded-lg shadow-lg border');
        div.innerHTML = `
          <h4 class="font-bold text-gray-900 mb-1 text-xs">Risk Legend</h4>
          <div class="space-y-1 text-xs">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-red-500 border border-white"></div>
              <span>High Risk Dam</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-amber-500 border border-white"></div>
              <span>Medium Risk Dam</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-green-500 border border-white"></div>
              <span>Low Risk Dam</span>
            </div>
            <hr class="my-2">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 border border-red-500 border-dashed rounded-full bg-red-500 bg-opacity-20"></div>
              <span>High Risk Zone</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 border border-amber-500 rounded-full bg-amber-500 bg-opacity-20"></div>
              <span>Medium Flood Zone</span>
            </div>
            <div class="text-[10px] text-gray-600 mt-1">Pinch to zoom, drag to pan</div>
          </div>
        `;
        L.DomEvent.disableClickPropagation(div);
        return div;
      };
      legend.addTo(map.current);
      legendRef.current = legend;
    }

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => {
      if (map.current && map.current.hasLayer(marker)) {
        map.current.removeLayer(marker);
      }
    });
    markersRef.current = {};

    // Add dam markers
      if (dams && Array.isArray(dams)) {
      dams.forEach(dam => {
        const riskData = risks?.find(r => r.dam?.id === dam.id);
        const riskLevel = riskData?.floodRisk || 'LOW';
        const riskScore = (riskData && typeof riskData.floodScore === 'number') ? riskData.floodScore : 0;
        const lsLevel = riskData?.landslideRisk || 'LOW';
        const lsScore = (riskData && typeof riskData.landslideScore === 'number') ? riskData.landslideScore : 0;

        const scoreStr = (typeof riskScore === 'number') ? riskScore.toFixed(0) : 'N/A';
        const capStr = (typeof dam.capacity === 'number') ? dam.capacity.toFixed(2) : 'N/A';
        const envSummary = riskData?.environmentalSummary || {};

        const color = getColorByRiskLevel(riskLevel);

        // Create custom icon based on risk level
        const getIconSymbol = (floodLevel, landslideLevel) => {
          if (floodLevel === 'HIGH' || landslideLevel === 'HIGH') return '⚠️';
          if (floodLevel === 'MEDIUM' || landslideLevel === 'MEDIUM') return '⚡';
          return '✓';
        };

        const iconSymbol = getIconSymbol(riskLevel, lsLevel);

        const icon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              background-color: ${color};
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              color: white;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              position: relative;
            ">
              ${iconSymbol}
              ${(riskLevel === 'HIGH' || lsLevel === 'HIGH') ? '<div style="position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background: #ef4444; border-radius: 50%; border: 2px solid white;"></div>' : ''}
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([dam.latitude, dam.longitude], { icon })
          .bindPopup(`
            <div class="bg-slate-900 text-white p-4 rounded-lg shadow-xl border border-slate-700" style="min-width: 280px; max-width: 320px;">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-bold text-lg text-white">${dam.name}</h3>
                <div class="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">${dam.state}</div>
              </div>
              
              <div class="space-y-3">
                <!-- Flood Risk Section -->
                <div class="bg-slate-800 p-3 rounded-lg">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-semibold text-blue-300">🌊 Flood Risk</span>
                    <span class="px-2 py-1 rounded text-xs font-bold" style="background-color: ${color}; color: white;">${riskLevel}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-slate-400">Score: ${scoreStr}/100</span>
                    <div class="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div class="h-full" style="width: ${scoreStr}%; background-color: ${color};"></div>
                    </div>
                  </div>
                </div>

                <!-- Landslide Risk Section -->
                <div class="bg-slate-800 p-3 rounded-lg">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-semibold text-orange-300">🏔️ Landslide Risk</span>
                    <span class="px-2 py-1 rounded text-xs font-bold" style="background-color: ${getColorByRiskLevel(lsLevel)}; color: white;">${lsLevel}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-slate-400">Score: ${lsScore}/100</span>
                    <div class="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div class="h-full" style="width: ${lsScore}%; background-color: ${getColorByRiskLevel(lsLevel)};"></div>
                    </div>
                  </div>
                </div>

                <!-- Environmental Data -->
                <div class="bg-slate-800 p-3 rounded-lg">
                  <h4 class="text-sm font-semibold text-slate-300 mb-2">📊 Environmental Data</h4>
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span class="text-slate-400">Rainfall (7d):</span>
                      <span class="text-white ml-1">${envSummary.cumRainfall7d ?? 'N/A'} mm</span>
                    </div>
                    <div>
                      <span class="text-slate-400">Discharge:</span>
                      <span class="text-white ml-1">${envSummary.riverDischarge ?? 'N/A'} m³/s</span>
                    </div>
                    <div>
                      <span class="text-slate-400">Soil Moisture:</span>
                      <span class="text-white ml-1">${envSummary.soilMoisture ?? 'N/A'}%</span>
                    </div>
                    <div>
                      <span class="text-slate-400">Capacity:</span>
                      <span class="text-white ml-1">${capStr} BCM</span>
                    </div>
                  </div>
                </div>

                <!-- Live Data Indicator -->
                <div class="flex items-center justify-center pt-2 border-t border-slate-700">
                  <span class="text-xs text-green-400 flex items-center gap-1">
                    <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Live Data Updated
                  </span>
                </div>
              </div>
            </div>
          `, {
            maxWidth: 350,
            className: 'custom-popup'
          })
          .addTo(map.current);

        marker.on('click', () => onDamSelect(dam.id));
        markersRef.current[dam.id] = marker;

        // Add risk zone circles for high-risk areas
        if (riskLevel === 'HIGH' || lsLevel === 'HIGH') {
          const riskRadius = Math.max(2000, Math.min(15000, (riskScore + lsScore) * 100)); // Reduced radius to prevent overlapping
          const riskColor = riskLevel === 'HIGH' ? color : getColorByRiskLevel(lsLevel);
          const riskOpacity = 0.2; // Reduced opacity

          const riskCircle = L.circle([dam.latitude, dam.longitude], {
            color: riskColor,
            fillColor: riskColor,
            fillOpacity: riskOpacity,
            radius: riskRadius,
            weight: 1, // Thinner border
            dashArray: '5, 5'
          }).addTo(map.current);

          // Store circle reference for cleanup
          if (!markersRef.current[`${dam.id}_circle`]) {
            markersRef.current[`${dam.id}_circle`] = riskCircle;
          }
        }

        // Separate medium flood risk zone visualization
        if (riskLevel === 'MEDIUM') {
          const mediumRadius = Math.max(1500, Math.min(9000, riskScore * 90));
          const mediumColor = getColorByRiskLevel('MEDIUM');

          const mediumCircle = L.circle([dam.latitude, dam.longitude], {
            color: mediumColor,
            fillColor: mediumColor,
            fillOpacity: 0.12,
            radius: mediumRadius,
            weight: 1,
          }).addTo(map.current);

          if (!markersRef.current[`${dam.id}_medium_circle`]) {
            markersRef.current[`${dam.id}_medium_circle`] = mediumCircle;
          }
        }
      });
    }

    return () => {
      // Cleanup on unmount
    };
  }, [dams, risks, onDamSelect]);

  // Invalidate map size when container resizes
  useEffect(() => {
    if (!map.current) return;
    const timer = setTimeout(() => map.current.invalidateSize(), 200);
    return () => clearTimeout(timer);
  });

  return (
    <div
      ref={mapContainer}
      className="w-full h-full rounded-lg shadow-lg"
      style={{ minHeight: '300px', height: '100%' }}
    />
  );
};

export default MapComponent;
