"use client";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  indeterminate?: boolean;
  className?: string;
}

function getColor(percent: number): string {
  if (percent >= 80) return "bg-red-500";
  if (percent >= 50) return "bg-yellow-500";
  return "bg-green-500";
}

export default function ProgressBar({
  value,
  max = 100,
  label,
  indeterminate = false,
  className = "",
}: ProgressBarProps) {
  const percent = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
          <span>{label}</span>
          {!indeterminate && <span>{Math.round(percent)}%</span>}
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        {indeterminate ? (
          <div className="h-full w-1/3 animate-[progress-slide_1.5s_ease-in-out_infinite] rounded-full bg-blue-500" />
        ) : (
          <div
            className={`h-full rounded-full transition-all duration-300 ${getColor(percent)}`}
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
    </div>
  );
}
