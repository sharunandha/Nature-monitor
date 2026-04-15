import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
// eslint-disable-next-line no-underscore-dangle
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const colorByReservoirStatus = (status) => {
  if (status === 'CRITICAL_HIGH') return '#dc2626';
  if (status === 'HIGH') return '#f97316';
  if (status === 'NORMAL') return '#16a34a';
  if (status === 'LOW') return '#f59e0b';
  if (status === 'CRITICAL_LOW') return '#1d4ed8';
  return '#6b7280';
};

const gaugeColorByPct = (pct) => {
  if (pct < 20) return '#dc2626';
  if (pct < 40) return '#f97316';
  if (pct < 70) return '#16a34a';
  if (pct < 85) return '#2563eb';
  return '#dc2626';
};

const reservoirGaugeHTML = (pct) => {
  const safePct = Math.max(0, Math.min(100, Number(pct || 0)));
  const arc = (safePct / 100) * 360;
  const color = gaugeColorByPct(safePct);

  return `
    <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
      <div style="width:62px;height:62px;border-radius:50%;background:conic-gradient(${color} ${arc}deg,#1f2937 ${arc}deg);display:flex;align-items:center;justify-content:center;">
        <div style="width:44px;height:44px;border-radius:50%;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${safePct.toFixed(1)}%</div>
      </div>
      <div style="font-size:12px;color:#cbd5e1;">
        <div style="font-weight:700;color:#f8fafc;">Reservoir Fill Gauge</div>
        <div>0-20% Red | 20-40% Orange | 40-70% Green | 70-85% Blue | 85-100% Red</div>
      </div>
    </div>
  `;
};

export const MapComponent = ({
  dams,
  selectedDam,
  onDamSelect,
  selectedState,
  reservoirByDam = {},
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const layersRef = useRef([]);
  const markerByIdRef = useRef({});
  const hasAutoFitRef = useRef(false);
  const fitKeyRef = useRef('');
  const [layerMode, setLayerMode] = useState('all');

  const visibleDams = useMemo(() => {
    if (!Array.isArray(dams)) return [];
    if (layerMode === 'state' && selectedState) {
      return dams.filter(d => d.state === selectedState);
    }
    return dams;
  }, [dams, layerMode, selectedState]);

  useEffect(() => {
    if (!mapContainer.current) return;

    if (!map.current) {
      map.current = L.map(mapContainer.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        dragging: true,
      }).setView([20.5937, 78.9629], 4);

      L.control.zoom({ position: 'topright' }).addTo(map.current);

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri',
        maxZoom: 18,
      }).addTo(map.current);

      const legend = L.control({ position: 'topright' });
      legend.onAdd = function onAdd() {
        const div = L.DomUtil.create('div', 'info legend bg-white p-2 rounded-lg shadow-lg border');
        div.innerHTML = `
          <h4 class="font-bold text-gray-900 mb-1 text-xs">Reservoir Marker Legend</h4>
          <div class="space-y-1 text-xs">
            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full" style="background:#dc2626;"></div><span>CRITICAL_HIGH</span></div>
            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full" style="background:#f97316;"></div><span>HIGH</span></div>
            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full" style="background:#16a34a;"></div><span>NORMAL</span></div>
            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full" style="background:#f59e0b;"></div><span>LOW</span></div>
            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full" style="background:#1d4ed8;"></div><span>CRITICAL_LOW</span></div>
          </div>
        `;
        L.DomEvent.disableClickPropagation(div);
        return div;
      };
      legend.addTo(map.current);
    }

    layersRef.current.forEach((layer) => {
      if (map.current && map.current.hasLayer(layer)) map.current.removeLayer(layer);
    });
    layersRef.current = [];

    markerByIdRef.current = {};

    visibleDams.forEach((dam) => {
      const reservoir = reservoirByDam[dam.id] || dam.reservoir || {};
      const status = reservoir.status || 'NORMAL';
      const pct = Number(reservoir.percentageFull || 0);
      const color = colorByReservoirStatus(status);
      const isSelected = dam.id === selectedDam;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background:${color};
            width:${isSelected ? 40 : 34}px;
            height:${isSelected ? 40 : 34}px;
            border-radius:50%;
            border:${isSelected ? 4 : 3}px solid ${isSelected ? '#fde047' : '#fff'};
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
            display:flex;
            align-items:center;
            justify-content:center;
            color:#fff;
            font-size:${isSelected ? 13 : 12}px;
            font-weight:700;
          ">
            ${Math.round(pct)}
          </div>
        `,
        iconSize: [isSelected ? 40 : 34, isSelected ? 40 : 34],
        iconAnchor: [isSelected ? 20 : 17, isSelected ? 20 : 17],
      });

      const marker = L.marker([dam.latitude, dam.longitude], {
        icon,
        zIndexOffset: isSelected ? 1000 : 0,
      }).addTo(map.current);
      const popup = `
        <div class="bg-slate-900 text-white p-4 rounded-lg" style="min-width:290px;max-width:340px;">
          <div class="flex items-center justify-between">
            <h3 style="font-weight:700;font-size:16px;">${dam.name}</h3>
            <span style="font-size:11px;background:#1e293b;padding:2px 8px;border-radius:10px;">${dam.state}</span>
          </div>
          <div style="margin-top:8px;font-size:12px;color:#cbd5e1;">${dam.river} River</div>

          ${reservoirGaugeHTML(pct)}

          <div style="margin-top:10px;padding:8px;background:#1e293b;border-radius:8px;font-size:12px;">
            <div style="display:flex;justify-content:space-between;"><span>Status</span><strong>${status}</strong></div>
            <div style="display:flex;justify-content:space-between;"><span>Current Level</span><strong>${Number(reservoir.currentLevel || 0).toFixed(2)} m</strong></div>
            <div style="display:flex;justify-content:space-between;"><span>Storage</span><strong>${Number(reservoir.currentStorage || 0).toFixed(2)} TMC</strong></div>
            <div style="display:flex;justify-content:space-between;"><span>Inflow</span><strong>${reservoir.inflow || 0} cusecs</strong></div>
            <div style="display:flex;justify-content:space-between;"><span>Outflow</span><strong>${reservoir.outflow || 0} cusecs</strong></div>
          </div>
        </div>
      `;
      marker.bindPopup(popup, { maxWidth: 360 });
      marker.on('click', () => onDamSelect(dam.id));
      layersRef.current.push(marker);
      markerByIdRef.current[dam.id] = marker;
    });

    if (layerMode === 'state' && selectedState) {
      const stateDams = visibleDams;
      if (stateDams.length) {
        const lats = stateDams.map(d => d.latitude);
        const lngs = stateDams.map(d => d.longitude);
        const bounds = [
          [Math.min(...lats) - 0.2, Math.min(...lngs) - 0.2],
          [Math.max(...lats) + 0.2, Math.max(...lngs) + 0.2],
        ];
        const rectangle = L.rectangle(bounds, {
          color: '#facc15',
          weight: 2,
          fillOpacity: 0.05,
          dashArray: '4,4',
        }).addTo(map.current);
        layersRef.current.push(rectangle);
      }
    }

    const fitKey = `${layerMode}|${selectedState || 'ALL'}|${visibleDams.length}`;
    if (visibleDams.length && (!hasAutoFitRef.current || fitKeyRef.current !== fitKey)) {
      const group = L.featureGroup(layersRef.current.filter(Boolean));
      map.current.fitBounds(group.getBounds().pad(0.25));
      hasAutoFitRef.current = true;
      fitKeyRef.current = fitKey;
    }
  }, [visibleDams, onDamSelect, reservoirByDam, layerMode, selectedState, selectedDam]);

  useEffect(() => {
    if (!map.current) return;
    const timer = setTimeout(() => map.current.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [selectedDam]);

  useEffect(() => {
    if (!map.current || !selectedDam) return;
    const marker = markerByIdRef.current[selectedDam];
    if (marker) {
      marker.openPopup();
      map.current.panTo(marker.getLatLng(), { animate: true });
    }
  }, [selectedDam]);

  return (
    <div className="w-full h-full rounded-lg shadow-lg relative" style={{ minHeight: '300px', height: '100%' }}>
      <div className="absolute top-3 left-3 z-[1000] bg-white rounded-lg shadow border p-2 text-xs max-w-[95%]">
        <div className="font-semibold text-gray-700 mb-1">Layers</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setLayerMode('all')}
            className={`px-2 py-1 rounded ${layerMode === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Show All Dams
          </button>
          <button
            onClick={() => setLayerMode('state')}
            className={`px-2 py-1 rounded ${layerMode === 'state' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Show by State
          </button>
        </div>
      </div>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
};

export default MapComponent;
