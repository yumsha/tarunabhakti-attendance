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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col justify-between min-h-[120px] sm:min-h-[130px] transition-all hover:shadow-md">
      {/* Top row: value + icon */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-none tracking-tight">
          {loading ? (
            <span className="inline-block w-16 h-8 sm:h-9 bg-gray-200 animate-pulse rounded" />
          ) : (
            value
          )}
        </span>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 flex-shrink-0">
          {icon}
        </div>
      </div>

      {/* Label */}
      <p className="text-xs sm:text-sm font-semibold text-gray-700 mt-2 truncate">{label}</p>

      {/* Trend badge */}
      {trend && (
        <div className={`flex items-center flex-wrap gap-1 mt-1.5 sm:mt-2 text-[11px] sm:text-xs font-medium ${isUp ? "text-red-500" : "text-green-500"}`}>
          {isUp ? (
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3l5 5H3l5-5z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 13L3 8h10l-5 5z" />
            </svg>
          )}
          <span className="truncate">
            {trend.value} {trend.label}
          </span>
        </div>
      )}

      {/* Optional plain subtitle (no trend) */}
      {!trend && (
        <div className="mt-1.5 sm:mt-2 h-3.5 sm:h-4" />
      )}
    </div>
  );
};

export default StatCard;
