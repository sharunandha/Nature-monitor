import React, { useEffect, useMemo, useState } from 'react';
import { dataAPI } from '../services/api';
import { LoadingSpinner } from './Common';
import { ReservoirTopDamsChart, StateReservoirSummaryChart } from './Charts';

const statusClass = (status) => {
  if (status === 'CRITICAL_HIGH') return 'bg-red-100 text-red-700 border border-red-300';
  if (status === 'HIGH') return 'bg-orange-100 text-orange-700 border border-orange-300';
  if (status === 'NORMAL') return 'bg-green-100 text-green-700 border border-green-300';
  if (status === 'LOW') return 'bg-yellow-100 text-yellow-700 border border-yellow-300';
  return 'bg-blue-100 text-blue-700 border border-blue-300 animate-pulse';
};

const pctClass = (pct) => {
  if (pct >= 85) return 'text-red-600 font-bold';
  if (pct >= 60) return 'text-orange-500 font-semibold';
  if (pct >= 30) return 'text-green-600 font-semibold';
  return 'text-blue-600 font-semibold';
};

const trendCell = (trend = 'STABLE') => {
  const t = String(trend).toUpperCase();
  if (t === 'RISING') return <span className="text-green-600 font-semibold">↑ RISING</span>;
  if (t === 'FALLING') return <span className="text-red-600 font-semibold">↓ FALLING</span>;
  return <span className="text-gray-600 font-semibold">→ STABLE</span>;
};

export const ReservoirMonitor = () => {
  const [loading, setLoading] = useState(false);
  const [allDams, setAllDams] = useState([]);
  const [stateRows, setStateRows] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [sortBy, setSortBy] = useState('percentageFull');
  const [sortDir, setSortDir] = useState('desc');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const response = await dataAPI.getReservoirLevels();
      const dams = response.data?.dams || [];
      setAllDams(dams);

      const grouped = dams.reduce((acc, dam) => {
        if (!acc[dam.state]) acc[dam.state] = [];
        acc[dam.state].push(dam);
        return acc;
      }, {});

      const states = Object.keys(grouped).sort().map((stateName) => {
        const rows = grouped[stateName];
        const avgFill = rows.length
          ? rows.reduce((sum, d) => sum + Number(d.reservoir?.percentageFull || 0), 0) / rows.length
          : 0;
        const avgLastYear = rows.length
          ? rows.reduce((sum, d) => sum + Number(d.reservoir?.lastYearPercentage || 0), 0) / rows.length
          : 0;
        const avgTenYear = rows.length
          ? rows.reduce((sum, d) => sum + Number(d.reservoir?.tenYearAveragePercent || 0), 0) / rows.length
          : 0;

        return {
          name: stateName,
          damCount: rows.length,
          avgFillPercent: +avgFill.toFixed(1),
          avgLastYearPercent: +avgLastYear.toFixed(1),
          avgTenYearPercent: +avgTenYear.toFixed(1),
        };
      });

      setStateRows(states);
      if (!selectedState && states.length) {
        setSelectedState(states[0].name);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDams = useMemo(() => {
    if (!selectedState) return allDams;
    return allDams.filter(d => d.state === selectedState);
  }, [allDams, selectedState]);

  const sortedDams = useMemo(() => {
    const items = [...filteredDams];
    const getter = (dam) => {
      if (sortBy === 'percentageFull') return Number(dam.reservoir?.percentageFull || 0);
      if (sortBy === 'currentLevel') return Number(dam.reservoir?.currentLevel || 0);
      if (sortBy === 'state') return dam.state || '';
      if (sortBy === 'name') return dam.name || '';
      if (sortBy === 'storage') return Number(dam.reservoir?.currentStorage || 0);
      return String(dam.reservoir?.lastUpdated || '');
    };

    items.sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return items;
  }, [filteredDams, sortBy, sortDir]);

  const summary = useMemo(() => {
    const totalDams = stateRows.reduce((sum, s) => sum + Number(s.damCount || 0), 0);
    const statesCovered = stateRows.length;
    const criticalHigh = filteredDams.filter(d => d.reservoir?.status === 'CRITICAL_HIGH').length;
    const criticalLow = filteredDams.filter(d => d.reservoir?.status === 'CRITICAL_LOW').length;
    return { totalDams, statesCovered, criticalHigh, criticalLow };
  }, [stateRows, filteredDams]);

  const clickSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortBy(col);
    setSortDir(col === 'state' || col === 'name' ? 'asc' : 'desc');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl md:text-3xl font-bold text-gray-900">💧 Reservoirs</h2>

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">State Filter</h3>
          <button
            onClick={fetchAll}
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {stateRows.map((state) => (
            <button
              key={state.name}
              onClick={() => setSelectedState(state.name)}
              className={`px-3 py-1.5 rounded-full border whitespace-nowrap text-sm ${
                selectedState === state.name
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }`}
            >
              {state.name} ({state.damCount})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Total Dams Monitored</p>
          <p className="text-2xl font-bold text-gray-900">{summary.totalDams}</p>
        </div>
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <p className="text-xs text-red-600">Critical High (&gt;=85%)</p>
          <p className="text-2xl font-bold text-red-700">{summary.criticalHigh}</p>
        </div>
        <div className="bg-white border border-orange-200 rounded-lg p-4">
          <p className="text-xs text-orange-600">Critical Low (&lt;20%)</p>
          <p className="text-2xl font-bold text-orange-700">{summary.criticalLow}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">States Covered</p>
          <p className="text-2xl font-bold text-gray-900">{summary.statesCovered}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm overflow-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Reservoir Levels</h3>
        {loading ? (
          <div className="py-8"><LoadingSpinner /></div>
        ) : (
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="text-left border-b border-gray-200 text-gray-700">
                <th className="py-2 cursor-pointer" onClick={() => clickSort('name')}>Dam Name</th>
                <th className="py-2 cursor-pointer" onClick={() => clickSort('state')}>State</th>
                <th className="py-2">River</th>
                <th className="py-2 cursor-pointer" onClick={() => clickSort('currentLevel')}>Current Level (m)</th>
                <th className="py-2 cursor-pointer" onClick={() => clickSort('percentageFull')}>% Full</th>
                <th className="py-2 cursor-pointer" onClick={() => clickSort('storage')}>Storage (TMC)</th>
                <th className="py-2">Inflow</th>
                <th className="py-2">Outflow</th>
                <th className="py-2">Trend</th>
                <th className="py-2">Status</th>
                <th className="py-2">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {sortedDams.map((dam) => (
                <tr key={dam.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 font-medium text-gray-900">{dam.name}</td>
                  <td className="py-2 text-gray-700">{dam.state}</td>
                  <td className="py-2 text-gray-700">{dam.river}</td>
                  <td className="py-2 text-gray-700">{Number(dam.reservoir?.currentLevel || 0).toFixed(2)}</td>
                  <td className={`py-2 ${pctClass(Number(dam.reservoir?.percentageFull || 0))}`}>
                    {Number(dam.reservoir?.percentageFull || 0).toFixed(1)}%
                  </td>
                  <td className="py-2 text-gray-700">{Number(dam.reservoir?.currentStorage || 0).toFixed(2)}</td>
                  <td className="py-2 text-gray-700">{dam.reservoir?.inflow || 0}</td>
                  <td className="py-2 text-gray-700">{dam.reservoir?.outflow || 0}</td>
                  <td className="py-2">{trendCell(dam.reservoir?.trend)}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass(dam.reservoir?.status)}`}>
                      {dam.reservoir?.status}
                    </span>
                  </td>
                  <td className="py-2 text-gray-500">{new Date(dam.reservoir?.lastUpdated || Date.now()).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <ReservoirTopDamsChart dams={sortedDams} />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <StateReservoirSummaryChart states={stateRows} />
        </div>
      </div>
    </div>
  );
};

export default ReservoirMonitor;
