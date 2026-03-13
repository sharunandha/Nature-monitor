import React from 'react';

export const LoadingSpinner = ({ size = 'md' }) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex justify-center items-center">
      <div className={`${sizes[size]} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}></div>
    </div>
  );
};

export const ErrorAlert = ({ message, onClose }) => {
  return (
    <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg flex justify-between items-center alert-slide shadow-sm">
      <span>🚨 {message}</span>
      <button
        onClick={onClose}
        className="text-red-600 hover:text-red-800 font-bold text-xl"
      >
        ×
      </button>
    </div>
  );
};

export const SuccessAlert = ({ message, onClose }) => {
  return (
    <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded-lg flex justify-between items-center alert-slide shadow-sm">
      <span>✓ {message}</span>
      <button
        onClick={onClose}
        className="text-green-600 hover:text-green-800 font-bold text-xl"
      >
        ×
      </button>
    </div>
  );
};

export const InfoCard = ({ icon, title, value, unit, trend, color = 'blue', className = '', style = {} }) => {
  const colors = {
    blue: 'from-blue-600 to-blue-500',
    green: 'from-green-600 to-green-500',
    red: 'from-red-600 to-red-500',
    amber: 'from-amber-600 to-amber-500',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-lg p-3 md:p-6 shadow-md text-white border border-opacity-20 border-white hover:shadow-lg transition ${className}`} style={style}>
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <p className="text-xs md:text-sm font-medium opacity-90 truncate">{title}</p>
          <p className="text-xl md:text-3xl font-bold mt-1 md:mt-2">{value}</p>
          {unit && <p className="text-xs opacity-75 mt-1">{unit}</p>}
        </div>
        <span className="text-2xl md:text-3xl ml-2 flex-shrink-0">{icon}</span>
      </div>
      {trend && (
        <p className="text-xs mt-3 opacity-90">
          Trend: <span className="font-semibold">{trend}</span>
        </p>
      )}
    </div>
  );
};

export const Badge = ({ level, size = 'md' }) => {
  const levelStyles = {
    LOW: 'bg-green-100 text-green-800 border border-green-300',
    MEDIUM: 'bg-amber-100 text-amber-800 border border-amber-300',
    HIGH: 'bg-red-100 text-red-800 border border-red-300',
  };

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span className={`inline-block rounded-full font-semibold ${levelStyles[level] || levelStyles.LOW} ${sizeStyles[size]}`}>
      {level}
    </span>
  );
};

export const RiskGauge = ({ score, label = 'Risk Score' }) => {
  const safeScore = Number.isFinite(Number(score)) ? Number(score) : 0;
  const color = safeScore >= 70 ? '#ef4444' : safeScore >= 40 ? '#f59e0b' : '#10b981';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${(safeScore / 100) * 282.74} 282.74`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">{safeScore.toFixed(0)}</div>
            <div className="text-xs text-gray-500">/ 100</div>
          </div>
        </div>
      </div>
      <p className="text-xs sm:text-sm text-gray-600 mt-2 sm:mt-3 text-center">{label}</p>
    </div>
  );
};

export const Toast = ({ message, type = 'info', onClose, duration = 5000 }) => {
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [onClose, duration]);

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${colors[type]} border rounded-lg p-4 shadow-lg animate-slideIn`}>
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="ml-4 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
    </div>
  );
};