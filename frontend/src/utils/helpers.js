import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const getColorByRiskLevel = (level) => {
  const colors = {
    LOW: '#10b981',     // green
    MEDIUM: '#f59e0b',  // amber
    HIGH: '#ef4444',    // red
  };
  return colors[level] || '#6b7280'; // gray default
};

export const getColorByRiskScore = (score) => {
  if (score >= 70) return '#ef4444';   // red
  if (score >= 40) return '#f59e0b';   // amber
  return '#10b981';                     // green
};

export const formatNumber = (num) => {
  return num.toFixed(2);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata'
  });
};

export const calculateTrend = (current, previous) => {
  if (current > previous) return 'increasing';
  if (current < previous) return 'decreasing';
  return 'stable';
};

export const getRiskDescription = (level) => {
  const descriptions = {
    LOW: 'Low risk, conditions are normal',
    MEDIUM: 'Moderate risk, continue monitoring',
    HIGH: 'High risk, take precautionary measures',
  };
  return descriptions[level] || 'Unknown';
};

export const exportToCSV = (data, filename) => {
  const csvContent = "data:text/csv;charset=utf-8," + data.map(row => row.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const drawMiniBarChart = ({ doc, x, y, width, height, labels, values, color }) => {
  if (!labels?.length || !values?.length) return;

  const maxValue = Math.max(...values.map(v => safeNumber(v, 0)), 1);
  const barWidth = width / values.length;

  doc.setDrawColor(220, 220, 220);
  doc.rect(x, y, width, height);

  values.forEach((rawVal, i) => {
    const value = safeNumber(rawVal, 0);
    const barHeight = (value / maxValue) * (height - 10);
    const barX = x + (i * barWidth) + 2;
    const barY = y + height - barHeight - 2;

    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(barX, barY, Math.max(barWidth - 4, 2), barHeight, 'F');

    doc.setTextColor(70, 70, 70);
    doc.setFontSize(7);
    doc.text(String(value.toFixed(1)), barX, barY - 1);

    const label = String(labels[i] || '').slice(5);
    doc.text(label, barX, y + height + 4);
  });
};

export const exportRiskData = (risks, dams) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const generatedAt = new Date().toLocaleString('en-IN');

  const mapped = (risks || []).map((risk) => {
    const dam = (dams || []).find(d => d.id === risk.dam?.id) || risk.dam || {};
    const floodScore = safeNumber(risk.floodScore, 0);
    const landslideScore = safeNumber(risk.landslideScore, 0);

    return {
      damName: dam.name || 'Unknown',
      state: dam.state || 'Unknown',
      river: dam.river || 'Unknown',
      floodRisk: risk.floodRisk || 'LOW',
      floodScore,
      landslideRisk: risk.landslideRisk || 'LOW',
      landslideScore,
      overall: Math.max(floodScore, landslideScore),
      latitude: safeNumber(dam.latitude, 0),
      longitude: safeNumber(dam.longitude, 0),
    };
  });

  const highRiskCount = mapped.filter(r => r.floodRisk === 'HIGH' || r.landslideRisk === 'HIGH').length;
  const avgFlood = mapped.length ? mapped.reduce((s, r) => s + r.floodScore, 0) / mapped.length : 0;
  const avgLandslide = mapped.length ? mapped.reduce((s, r) => s + r.landslideScore, 0) / mapped.length : 0;

  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text('Flood and Landslide Risk Analysis Report', 14, 14);
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(`Generated: ${generatedAt}`, 14, 20);
  doc.text(`Total Dams: ${mapped.length}`, 14, 26);
  doc.text(`High Risk Zones: ${highRiskCount}`, 70, 26);
  doc.text(`Avg Flood Score: ${avgFlood.toFixed(1)}`, 130, 26);
  doc.text(`Avg Landslide Score: ${avgLandslide.toFixed(1)}`, 190, 26);

  const top = [...mapped].sort((a, b) => b.overall - a.overall).slice(0, 8);
  drawMiniBarChart({
    doc,
    x: 14,
    y: 32,
    width: 120,
    height: 36,
    labels: top.map(t => t.damName.slice(0, 8)),
    values: top.map(t => t.overall),
    color: [220, 38, 38],
  });
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text('Top overall risk scores (visual chart)', 14, 72);

  autoTable(doc, {
    startY: 78,
    head: [[
      'Dam', 'State', 'River', 'Flood Risk', 'Flood Score', 'Landslide Risk', 'Landslide Score', 'Overall', 'Latitude', 'Longitude'
    ]],
    body: mapped.map(r => [
      r.damName,
      r.state,
      r.river,
      r.floodRisk,
      r.floodScore.toFixed(1),
      r.landslideRisk,
      r.landslideScore.toFixed(1),
      r.overall.toFixed(1),
      r.latitude.toFixed(4),
      r.longitude.toFixed(4),
    ]),
    styles: { fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: [30, 64, 175] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Data source: Live API responses shown in dashboard (Open-Meteo, NASA POWER, GloFAS, USGS).', 14, pageHeight - 8);

  doc.save(`risk-analysis-report-${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const exportRainfallData = (rainfallData, damName) => {
  const daily = rainfallData?.forecast?.daily;
  if (!daily?.time?.length) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const generatedAt = new Date().toLocaleString('en-IN');
  const rainValues = (daily.precipitation_sum || []).map(v => safeNumber(v, 0));
  const totalRain = rainValues.reduce((s, v) => s + v, 0);
  const peakRain = rainValues.length ? Math.max(...rainValues) : 0;
  const avgRain = rainValues.length ? totalRain / rainValues.length : 0;

  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text('Rainfall Forecast Analysis Report', 14, 14);
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(`Dam: ${damName || 'Selected Dam'}`, 14, 20);
  doc.text(`Generated: ${generatedAt}`, 14, 25);

  doc.setTextColor(40, 40, 40);
  doc.text(`Forecast Window: ${daily.time[0]} to ${daily.time[daily.time.length - 1]}`, 14, 32);
  doc.text(`Total Rainfall: ${totalRain.toFixed(1)} mm`, 14, 37);
  doc.text(`Average Rainfall: ${avgRain.toFixed(1)} mm/day`, 80, 37);
  doc.text(`Peak Day Rainfall: ${peakRain.toFixed(1)} mm`, 150, 37);

  drawMiniBarChart({
    doc,
    x: 14,
    y: 42,
    width: 182,
    height: 44,
    labels: daily.time,
    values: rainValues,
    color: [37, 99, 235],
  });
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text('Daily precipitation bars (mm)', 14, 90);

  autoTable(doc, {
    startY: 95,
    head: [['Date', 'Precipitation (mm)', 'Label']],
    body: daily.time.map((date, i) => {
      const v = safeNumber(daily.precipitation_sum?.[i], 0);
      const label = v >= 20 ? 'Very Heavy' : v >= 10 ? 'Heavy' : v >= 2 ? 'Moderate' : 'Light/None';
      return [date, v.toFixed(1), label];
    }),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [14, 116, 144] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Source: Open-Meteo forecast data currently used in the dashboard rainfall chart.', 14, pageHeight - 8);

  doc.save(`rainfall-analysis-${String(damName || 'selected-dam').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const exportToPDF = async (risks, dams, advancedRiskData) => {
  // This will be implemented with a PDF library like jsPDF
  // For now, create a comprehensive text report
  const reportData = {
    title: "Comprehensive Flood & Landslide Risk Assessment Report",
    generatedAt: new Date().toLocaleString(),
    summary: {
      totalDams: dams.length,
      highRiskAreas: risks.filter(r => r.floodRisk === 'HIGH' || r.landslideRisk === 'HIGH').length,
      normalConditions: risks.filter(r => r.floodRisk === 'LOW' && r.landslideRisk === 'LOW').length
    },
    risks: risks.map(risk => {
      const dam = dams.find(d => d.id === risk.dam?.id);
      return {
        damName: dam?.name || 'Unknown',
        state: dam?.state || 'Unknown',
        floodRisk: risk.floodRisk,
        landslideRisk: risk.landslideRisk,
        location: `${dam?.latitude || 0}, ${dam?.longitude || 0}`
      };
    }),
    advancedAnalysis: advancedRiskData ? {
      overallScore: advancedRiskData.overallRisk?.score,
      confidence: advancedRiskData.confidence,
      dataSources: advancedRiskData.dataSources
    } : null
  };

  // Create a downloadable text file for now (will be replaced with PDF)
  const content = `
COMPREHENSIVE RISK ASSESSMENT REPORT
====================================

Generated: ${reportData.generatedAt}

EXECUTIVE SUMMARY
-----------------
Total Dams Monitored: ${reportData.summary.totalDams}
High Risk Areas: ${reportData.summary.highRiskAreas}
Normal Conditions: ${reportData.summary.normalConditions}

${reportData.advancedAnalysis ? `
ADVANCED ANALYSIS
-----------------
Overall Risk Score: ${reportData.advancedAnalysis.overallScore}/100
Confidence Level: ${reportData.advancedAnalysis.confidence}%
Data Sources: ${reportData.advancedAnalysis.dataSources?.join(', ')}
` : ''}

DETAILED RISK ANALYSIS
----------------------
${reportData.risks.map((risk, idx) => 
  `${idx + 1}. ${risk.damName} (${risk.state})
     Flood Risk: ${risk.floodRisk}
     Landslide Risk: ${risk.landslideRisk}
     Location: ${risk.location}
`).join('\n')}

RECOMMENDATIONS
---------------
${reportData.summary.highRiskAreas > 0 ? 
  '⚠️  IMMEDIATE ATTENTION REQUIRED for high-risk areas' : 
  '✅ All monitored areas are within normal risk levels'}

This report was generated using live data from multiple sources including:
- Open-Meteo Weather API
- NASA POWER Satellite Data
- USGS Earthquake Hazards Program
- GloFAS Flood Forecasting
- Advanced AI analysis algorithms
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `risk-assessment-report-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};
