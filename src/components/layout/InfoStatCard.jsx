const TONE_STYLES = {
  blue: {
    iconWrap: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  emerald: {
    iconWrap: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  amber: {
    iconWrap: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  violet: {
    iconWrap: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  red: {
    iconWrap: "bg-red-50",
    iconColor: "text-red-600",
  },
  orange: {
    iconWrap: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  teal: {
    iconWrap: "bg-teal-50",
    iconColor: "text-teal-600",
  },
  slate: {
    iconWrap: "bg-slate-100",
    iconColor: "text-slate-600",
  },
};

export default function InfoStatCard({
  label,
  value,
  helper,
  icon,
  tone = "blue",
  loading = false,
  valueClassName = "text-gray-900",
  className = "",
}) {
  const toneStyle = TONE_STYLES[tone] || TONE_STYLES.blue;

  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{label}</p>
          {loading ? (
            <div className="mt-2 h-9 w-20 animate-pulse rounded-lg bg-gray-200" />
          ) : (
            <p className={`mt-1 text-3xl font-semibold ${valueClassName}`}>{value}</p>
          )}
          {helper ? <p className="mt-2 text-xs text-gray-400">{helper}</p> : null}
        </div>

        {icon ? (
          <div className={`rounded-2xl p-3 ${toneStyle.iconWrap}`}>
            <div className={toneStyle.iconColor}>{icon}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
