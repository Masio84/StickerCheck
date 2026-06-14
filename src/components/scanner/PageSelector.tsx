"use client";

interface PageSelectorProps {
  pageNumber: number;
  rows: number;
  cols: number;
  sectionName?: string;
  albumPages: { page_number: number; section_name?: string | null; rows: number; cols: number }[];
  onPageChange: (page: number) => void;
  onGridChange: (rows: number, cols: number) => void;
}

export function PageSelector({
  pageNumber,
  rows,
  cols,
  sectionName,
  albumPages,
  onPageChange,
  onGridChange,
}: PageSelectorProps) {
  return (
    <div className="space-y-4">
      {albumPages.length > 0 && (
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Sección del álbum
          </label>
          <select
            value={pageNumber}
            onChange={(e) => onPageChange(parseInt(e.target.value, 10))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
          >
            {albumPages.map((page) => (
              <option key={page.page_number} value={page.page_number}>
                Pág. {page.page_number} — {page.section_name || "Sin nombre"} (
                {page.rows}x{page.cols})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Página del álbum
          </label>
          <input
            type="number"
            min={1}
            value={pageNumber}
            onChange={(e) => onPageChange(parseInt(e.target.value, 10) || 1)}
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
            onChange={(e) => onGridChange(parseInt(e.target.value, 10) || 3, cols)}
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
            onChange={(e) => onGridChange(rows, parseInt(e.target.value, 10) || 3)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {sectionName && (
        <p className="text-sm text-emerald-400">
          Sección actual: <span className="font-medium">{sectionName}</span> ·
          Cuadrícula {rows}×{cols}
        </p>
      )}
    </div>
  );
}
