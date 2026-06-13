"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ScanLine, Search } from "lucide-react";
import type { Category, Collection, Sticker, StickerStatus } from "@/lib/types";
import { Filters } from "@/components/checklist/Filters";
import { ProgressBar } from "@/components/checklist/ProgressBar";
import { StickerGrid } from "@/components/checklist/StickerGrid";
import { createClient } from "@/lib/supabase/client";

interface ChecklistClientProps {
  collection: Collection;
  categories: Category[];
  stickers: Sticker[];
  initialUserStatus: Record<string, { status: StickerStatus; duplicate_count: number }>;
}

export function ChecklistClient({
  collection,
  categories,
  stickers,
  initialUserStatus,
}: ChecklistClientProps) {
  const [userStatus, setUserStatus] = useState(initialUserStatus);
  const [filter, setFilter] = useState<"all" | "pending" | "marked" | "duplicates">("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const filteredStickers = useMemo(() => {
    return stickers.filter((s) => {
      const status = userStatus[s.id];
      const isOwned = status?.status === "owned" || status?.status === "duplicate";
      const isDuplicate = status?.status === "duplicate";

      if (filter === "pending" && isOwned) return false;
      if (filter === "marked" && !isOwned) return false;
      if (filter === "duplicates" && !isDuplicate) return false;

      if (search) {
        const q = search.toLowerCase();
        return (
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          String(s.number).includes(q)
        );
      }
      return true;
    });
  }, [stickers, userStatus, filter, search]);

  const ownedCount = stickers.filter((s) => {
    const st = userStatus[s.id];
    return st?.status === "owned" || st?.status === "duplicate";
  }).length;

  const saveSticker = useCallback(
    async (
      stickerId: string,
      status: StickerStatus,
      duplicateCount: number
    ) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("user_stickers").upsert(
        {
          user_id: user.id,
          collection_id: collection.id,
          sticker_id: stickerId,
          status,
          duplicate_count: duplicateCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,sticker_id" }
      );
    },
    [supabase, collection.id]
  );

  const handleToggle = async (stickerId: string) => {
    setSaving(true);
    const current = userStatus[stickerId];
    const isOwned = current?.status === "owned" || current?.status === "duplicate";

    if (isOwned) {
      const next = { ...userStatus };
      delete next[stickerId];
      setUserStatus(next);
      await supabase
        .from("user_stickers")
        .delete()
        .eq("sticker_id", stickerId);
    } else {
      const next = {
        ...userStatus,
        [stickerId]: { status: "owned" as StickerStatus, duplicate_count: 0 },
      };
      setUserStatus(next);
      await saveSticker(stickerId, "owned", 0);
    }
    setSaving(false);
  };

  const handleDuplicate = async (stickerId: string, delta: number) => {
    setSaving(true);
    const current = userStatus[stickerId] || {
      status: "owned" as StickerStatus,
      duplicate_count: 0,
    };
    const newCount = Math.max(0, current.duplicate_count + delta);
    const status: StickerStatus = newCount > 0 ? "duplicate" : "owned";

    setUserStatus({
      ...userStatus,
      [stickerId]: { status, duplicate_count: newCount },
    });
    await saveSticker(stickerId, status, newCount);
    setSaving(false);
  };

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      hasStickers: filteredStickers.some((s) => s.category_id === cat.id),
    }))
    .filter((cat) => cat.hasStickers);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {collection.name}
          </h1>
          <p className="mt-1 text-slate-400">
            Checklist interactivo · {collection.total_count} elementos
          </p>
        </div>
        <Link
          href={`/collections/${collection.slug}/scan`}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400"
        >
          <ScanLine className="h-4 w-4" />
          Escanear página
        </Link>
      </div>

      <div className="mt-6">
        <ProgressBar current={ownedCount} total={collection.total_count} />
        {saving && (
          <p className="mt-1 text-xs text-emerald-400">Guardando...</p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, equipo o número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <Filters active={filter} onChange={setFilter} />
      </div>

      <div className="mt-8">
        <StickerGrid
          categories={filteredCategories}
          stickers={filteredStickers}
          userStatus={userStatus}
          onToggle={handleToggle}
          onDuplicate={handleDuplicate}
        />
      </div>
    </div>
  );
}
