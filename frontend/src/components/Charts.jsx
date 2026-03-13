import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const RainfallChart = ({ data, label = 'Rainfall (mm)' }) => {
  if (!data || !data.daily) {
    return <div className="text-gray-500 text-center py-8">No rainfall data available</div>;
  }

  const chartData = {
    labels: data.daily.time || [],
    datasets: [
      {
        label,
        data: data.daily.precipitation_sum || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: {
          color: '#374151',
          font: { size: 12 },
        },
      },
      title: {
        display: true,
        text: 'Live Rainfall Forecast (Open-Meteo)',
        color: '#6b7280',
        font: { size: 11, weight: 'normal' },
      },
    },
    scales: {
      y: {
        ticks: { color: '#6b7280' },
        grid: { color: '#e5e7eb' },
        title: { display: true, text: 'mm', color: '#9ca3af' },
      },
      x: {
        ticks: { color: '#6b7280' },
        grid: { color: '#e5e7eb' },
      },
    },
  };

  return <Line data={chartData} options={options} />;
};

export const RiskTrendChart = ({ floodRisks, landslideRisks, environmentalData }) => {
  // ── Current & predicted scores ──
  const floodCurrent = floodRisks?.current?.score || 0;
  const floodPredicted = floodRisks?.prediction24h?.predicted24h || floodCurrent;
  const lsCurrent = landslideRisks?.current?.score || 0;
  const lsPredicted = landslideRisks?.prediction24h?.predicted24h || lsCurrent;

  // ── Estimate past-24h scores from daily precipitation history ──
  // dailyHistory contains the last 7 days; use the last 2 entries to model yesterday's risk
  const dailyHistory = environmentalData?.rainfall?.dailyHistory || [];
  const histLen = dailyHistory.length;

  // Yesterday's rain → rough "past flood risk" estimate
  const yesterdayRain = histLen >= 2 ? dailyHistory[histLen - 2]?.precipitation || 0 : 0;
  const dayBeforeRain = histLen >= 3 ? dailyHistory[histLen - 3]?.precipitation || 0 : 0;
  // Approximate past flood score: scale by the ratio of yesterday rain to total recent rain
  const todayRain = environmentalData?.rainfall?.forecast || 0;
  const rainRatio = todayRain > 0 ? yesterdayRain / todayRain : (yesterdayRain > 0 ? 1.2 : 0.8);
  const floodPast24 = Math.max(0, Math.min(100, +(floodCurrent * Math.min(rainRatio, 1.5)).toFixed(1)));
  // Landslide past: soil moisture changes slowly, use a dampened estimate
  const rainRatio2 = todayRain > 0 ? dayBeforeRain / todayRain : (dayBeforeRain > 0 ? 1.1 : 0.85);
  const lsPast24 = Math.max(0, Math.min(100, +(lsCurrent * Math.min(rainRatio2, 1.3)).toFixed(1)));

  // Linear interpolation helper
  const lerp = (a, b, steps) =>
    Array.from({ length: steps }, (_, i) => +(a + (b - a) * (i / (steps - 1))).toFixed(1));

  // Past 24h (5 points: -24h → Now) + Future 24h (5 points: Now → +24h), share "Now"
  const pastFlood = lerp(floodPast24, floodCurrent, 5);
  const futureFlood = lerp(floodCurrent, floodPredicted, 5);
  const pastLs = lerp(lsPast24, lsCurrent, 5);
  const futureLs = lerp(lsCurrent, lsPredicted, 5);

  // Merge (drop duplicate "Now" from future)
  const floodData = [...pastFlood, ...futureFlood.slice(1)];
  const lsData = [...pastLs, ...futureLs.slice(1)];

  const chartData = {
    labels: ['-24h', '-18h', '-12h', '-6h', 'Now', '+6h', '+12h', '+18h', '+24h'],
    datasets: [
      {
        label: 'Flood Risk',
        data: floodData,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#ef4444',
        pointRadius: (ctx) => ctx.dataIndex === 4 ? 6 : 3,  // Larger dot at "Now"
      },
      {
        label: 'Landslide Risk',
        data: lsData,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#f59e0b',
        pointRadius: (ctx) => ctx.dataIndex === 4 ? 6 : 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: {
          color: '#374151',
          font: { size: 12 },
        },
      },
      title: {
        display: true,
        text: 'Risk Trend: Past 24h ← Now → Next 24h',
        color: '#6b7280',
        font: { size: 11, weight: 'normal' },
      },
      annotation: {
        annotations: {
          nowLine: {
            type: 'line',
            xMin: 4,
            xMax: 4,
            borderColor: '#6b7280',
            borderWidth: 1,
            borderDash: [4, 4],
          },
        },
      },
    },
    scales: {
      y: {
        max: 100,
        min: 0,
        ticks: { color: '#6b7280' },
        grid: { color: '#e5e7eb' },
        title: { display: true, text: 'Risk Score', color: '#9ca3af' },
      },
      x: {
        ticks: {
          color: '#6b7280',
          font: (ctx) => ({ weight: ctx.index === 4 ? 'bold' : 'normal' }),
        },
        grid: { color: '#e5e7eb' },
      },
    },
  };

  return <Line data={chartData} options={options} />;
};

export const ReservoirChart = ({ reservoirs }) => {
  if (!reservoirs || reservoirs.length === 0) {
    return <div className="text-gray-500 text-center py-8">No reservoir data</div>;
  }

  const chartData = {
    labels: reservoirs.map(r => `${r.name} (${r.state})`),
    datasets: [
      {
        label: 'Reservoir Level (%)',
        data: reservoirs.map(r => r.currentLevel),
        backgroundColor: reservoirs.map(r => {
          if (r.currentLevel > 85) return '#ef4444';
          if (r.currentLevel > 75) return '#f59e0b';
          if (r.currentLevel > 60) return '#eab308';
          if (r.currentLevel > 40) return '#3b82f6';
          return '#10b981';
        }),
        borderColor: '#d1d5db',
        borderWidth: 1,
        borderRadius: 4,
        barThickness: 22,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Reservoir Levels — Derived from Live Environmental Data',
        color: '#374151',
        font: { size: 13, weight: 'bold' },
        padding: { bottom: 16 },
      },
      tooltip: {
        callbacks: {
          afterLabel: (ctx) => {
            const r = reservoirs[ctx.dataIndex];
            return [
              `Rain (7d): ${r.cumulativePrecip7d ?? 0} mm`,
              `Discharge: ${r.riverDischarge ?? 0} m³/s`,
              `Trend: ${r.trend || 'stable'}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        max: 100,
        min: 0,
        ticks: { color: '#6b7280', callback: v => `${v}%` },
        grid: { color: '#f3f4f6' },
        title: { display: true, text: 'Storage Level (%)', color: '#9ca3af', font: { size: 12 } },
      },
      y: {
        ticks: { color: '#374151', font: { size: 12 } },
        grid: { display: false },
      },
    },
  };

  return (
    <div style={{ height: `${Math.max(reservoirs.length * 42, 300)}px` }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export const HistoricalComparisonChart = ({ currentData, historicalData }) => {
  if (!currentData || !historicalData) {
    return <div className="text-gray-500 text-center py-8">No historical data available for comparison</div>;
  }

  const chartData = {
    labels: ['Current', 'Last Week', 'Last Month', 'Last Year'],
    datasets: [
      {
        label: 'Flood Risk Score',
        data: [
          currentData.floodRisk?.current?.score || 0,
          historicalData.lastWeek?.floodRisk || 0,
          historicalData.lastMonth?.floodRisk || 0,
          historicalData.lastYear?.floodRisk || 0,
        ],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Landslide Risk Score',
        data: [
          currentData.landslideRisk?.current?.score || 0,
          historicalData.lastWeek?.landslideRisk || 0,
          historicalData.lastMonth?.landslideRisk || 0,
          historicalData.lastYear?.landslideRisk || 0,
        ],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: {
          color: '#374151',
          font: { size: 12 },
        },
      },
      title: {
        display: true,
        text: 'Historical Risk Comparison',
        color: '#6b7280',
        font: { size: 13, weight: 'bold' },
      },
    },
    scales: {
      y: {
        max: 100,
        min: 0,
        ticks: { color: '#6b7280' },
        grid: { color: '#e5e7eb' },
        title: { display: true, text: 'Risk Score', color: '#9ca3af' },
      },
      x: {
        ticks: { color: '#6b7280' },
        grid: { color: '#e5e7eb' },
      },
    },
  };

  return <Line data={chartData} options={options} />;
};
