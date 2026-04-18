import React from "react";

/**
 * StatCard – matches the design image.
 *
 * Props:
 *  - value      : number / string (the big headline number)
 *  - label      : card title, e.g. "Total Employees"
 *  - icon       : JSX icon element
 *  - trend      : { value: "+3%", direction: "up"|"down", label: "Increase than yesterday" }
 *  - loading    : boolean – shows skeleton while true
 */
const StatCard = ({ value, label, icon, trend, loading }) => {
  const isUp = trend?.direction === "up";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between min-h-[130px]">
      {/* Top row: value + icon */}
      <div className="flex items-start justify-between">
        <span className="text-4xl font-extrabold text-gray-900 leading-none">
          {loading ? (
            <span className="inline-block w-16 h-9 bg-gray-200 animate-pulse rounded" />
          ) : (
            value
          )}
        </span>
        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 flex-shrink-0">
          {icon}
        </div>
      </div>

      {/* Label */}
      <p className="text-sm font-semibold text-gray-700 mt-2">{label}</p>

      {/* Trend badge */}
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${isUp ? "text-red-500" : "text-green-500"}`}>
          {isUp ? (
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3l5 5H3l5-5z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 13L3 8h10l-5 5z" />
            </svg>
          )}
          <span>
            {trend.value} {trend.label}
          </span>
        </div>
      )}

      {/* Optional plain subtitle (no trend) */}
      {!trend && (
        <div className="mt-2 h-4" />
      )}
    </div>
  );
};

export default StatCard;
