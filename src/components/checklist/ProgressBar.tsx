interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export function ProgressBar({ current, total, label }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      {label && (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-400">{label}</span>
          <span className="font-medium text-emerald-400">
            {current}/{total} marcados ({percent}%)
          </span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
