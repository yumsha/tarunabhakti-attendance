import React from 'react';

const StatCard = ({ icon, title, subtitle, value, color, valueColor }) => {
  return (
    <div className="flex flex-col items-start bg-white rounded-xl shadow p-5 min-w-[180px] min-h-[120px]">
      <div className={`w-10 h-10 flex items-center justify-center rounded-full mb-3 ${color}`}>{icon}</div>
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="text-xs text-gray-400 mb-1">{subtitle}</div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
    </div>
  );
};

export default StatCard;
