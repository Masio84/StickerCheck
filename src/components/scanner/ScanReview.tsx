"use client";

import { Check, X } from "lucide-react";
import type { ScanCellResult } from "@/lib/types";

interface ScanReviewProps {
  cells: ScanCellResult[];
  onToggle: (row: number, col: number) => void;
  onConfirm: () => void;
  saving: boolean;
}

export function ScanReview({ cells, onToggle, onConfirm, saving }: ScanReviewProps) {
  const selected = cells.filter((c) => c.selected && c.filled);

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-800/50 p-4">
        <p className="text-sm text-slate-400">
          Revisa los cromos detectados antes de guardar. Desmarca los incorrectos.
        </p>
        <p className="mt-1 font-medium text-emerald-400">
          {selected.length} cromo(s) seleccionado(s)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {cells
          .filter((c) => c.filled)
          .map((cell) => (
            <button
              key={`${cell.row}-${cell.col}`}
              onClick={() => onToggle(cell.row, cell.col)}
              className={`rounded-lg border p-3 text-left transition-all ${
                cell.selected
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-slate-700 bg-slate-800/50 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  [{cell.row + 1},{cell.col + 1}]
                </span>
                {cell.selected ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <X className="h-4 w-4 text-slate-500" />
                )}
              </div>
              <p className="mt-1 text-sm font-bold text-emerald-400">
                {cell.stickerCode || cell.ocrText || "?"}
              </p>
              <p className="text-xs text-slate-400 line-clamp-1">
                {cell.stickerName || "Sin identificar"}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Confianza: {Math.round(cell.confidence * 100)}%
              </p>
            </button>
          ))}
      </div>

      {cells.filter((c) => c.filled).length === 0 && (
        <p className="text-center text-slate-500">
          No se detectaron cromos pegados. Intenta con mejor luz o ajusta filas/columnas.
        </p>
      )}

      <button
        onClick={onConfirm}
        disabled={saving || selected.length === 0}
        className="w-full rounded-lg bg-emerald-500 py-3 font-medium text-white hover:bg-emerald-400 disabled:opacity-50"
      >
        {saving ? "Guardando..." : `Marcar ${selected.length} cromo(s) como tengo`}
      </button>
    </div>
  );
}
