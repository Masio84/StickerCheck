"use client";

import type { FilterType } from "@/lib/types";

const filters: { id: FilterType; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Pendientes" },
  { id: "marked", label: "Marcados" },
  { id: "duplicates", label: "Repetidos" },
];

interface FiltersProps {
  active: FilterType;
  onChange: (filter: FilterType) => void;
}

export function Filters({ active, onChange }: FiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onChange(filter.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            active === filter.id
              ? "bg-emerald-500 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
