"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Category, Sticker, StickerStatus } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";

interface StickerGridProps {
  categories: Category[];
  stickers: Sticker[];
  userStatus: Record<string, { status: StickerStatus; duplicate_count: number }>;
  onToggle: (stickerId: string) => void;
  onDuplicate: (stickerId: string, delta: number) => void;
}

export function StickerGrid({
  categories,
  stickers,
  userStatus,
  onToggle,
  onDuplicate,
}: StickerGridProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const categoryStickers = stickers.filter(
          (s) => s.category_id === category.id
        );
        const owned = categoryStickers.filter(
          (s) => userStatus[s.id]?.status === "owned" || userStatus[s.id]?.status === "duplicate"
        ).length;
        const isCollapsed = collapsed[category.id];

        return (
          <section
            key={category.id}
            className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50"
          >
            <button
              onClick={() =>
                setCollapsed((prev) => ({
                  ...prev,
                  [category.id]: !prev[category.id],
                }))
              }
              className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? (
                  <ChevronRight className="h-5 w-5 text-slate-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-500" />
                )}
                <h3 className="font-semibold text-white">{category.name}</h3>
              </div>
              <span className="text-sm text-slate-400">
                {owned}/{categoryStickers.length}
              </span>
            </button>

            {!isCollapsed && (
              <div className="border-t border-slate-800 p-4">
                <ProgressBar
                  current={owned}
                  total={categoryStickers.length}
                  label=""
                />
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {categoryStickers.map((sticker) => {
                    const status = userStatus[sticker.id];
                    const isOwned =
                      status?.status === "owned" || status?.status === "duplicate";
                    const isDuplicate = status?.status === "duplicate";

                    return (
                      <div
                        key={sticker.id}
                        className={`group relative rounded-lg border p-3 transition-all ${
                          isOwned
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                        }`}
                      >
                        <button
                          onClick={() => onToggle(sticker.id)}
                          className="w-full text-left"
                        >
                          <p className="text-xs font-bold text-emerald-400">
                            {sticker.code}
                          </p>
                          <p className="mt-1 text-xs text-slate-300 line-clamp-2">
                            {sticker.name}
                          </p>
                        </button>
                        {isOwned && (
                          <div className="mt-2 flex items-center justify-between">
                            <button
                              onClick={() => onDuplicate(sticker.id, -1)}
                              className="rounded bg-slate-700 px-1.5 text-xs text-slate-300 hover:bg-slate-600"
                            >
                              -
                            </button>
                            <span className="text-xs text-slate-400">
                              {isDuplicate ? `x${status.duplicate_count + 1}` : "Tengo"}
                            </span>
                            <button
                              onClick={() => onDuplicate(sticker.id, 1)}
                              className="rounded bg-slate-700 px-1.5 text-xs text-slate-300 hover:bg-slate-600"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
