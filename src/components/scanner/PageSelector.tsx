"use client";

interface PageSelectorProps {
  pageNumber: number;
  rows: number;
  cols: number;
  onPageChange: (page: number) => void;
  onGridChange: (rows: number, cols: number) => void;
}

export function PageSelector({
  pageNumber,
  rows,
  cols,
  onPageChange,
  onGridChange,
}: PageSelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <label className="mb-1 block text-sm text-slate-400">Página del álbum</label>
        <input
          type="number"
          min={1}
          value={pageNumber}
          onChange={(e) => onPageChange(parseInt(e.target.value) || 1)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-400">Filas</label>
        <input
          type="number"
          min={1}
          max={10}
          value={rows}
          onChange={(e) => onGridChange(parseInt(e.target.value) || 3, cols)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-400">Columnas</label>
        <input
          type="number"
          min={1}
          max={10}
          value={cols}
          onChange={(e) => onGridChange(rows, parseInt(e.target.value) || 3)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
