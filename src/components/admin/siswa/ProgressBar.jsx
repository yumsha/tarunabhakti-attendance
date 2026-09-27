import React from "react";

export default function ProgressBar({ current, total, color = "blue" }) {
  const pct = total ? Math.round((current / total) * 100) : 0;
  const barColor = color === "emerald" ? "bg-emerald-500" : "bg-blue-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500 font-medium">
        <span>Memproses {current} dari {total} baris...</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
