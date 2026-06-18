"use client";

import { useMemo, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import type { Collection, Sticker, StickerStatus } from "@/lib/types";

interface PrintClientProps {
  collection: Collection;
  stickers: Sticker[];
  userStatus: Record<string, { status: StickerStatus; duplicate_count: number }>;
  userEmail: string;
}

export function PrintClient({
  collection,
  stickers,
  userStatus,
  userEmail,
}: PrintClientProps) {
  // Helper to extract the numeric part of a sticker code (e.g., MEX12 -> 12, FWC19 -> 19)
  const getNumericPart = (code: string): number => {
    const match = code.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // Group sorting order: Especiales (Inicio) -> Grupo A-H -> Especiales (Fin)
  const getGroupInfo = (s: Sticker) => {
    const code = s.key_code || s.code;
    if (!s.group_name) {
      const isCc = code.startsWith("CC");
      const fwcMatch = code.match(/^FWC\s*(\d+)$/i) || code.match(/^FWC(\d+)$/i);
      const fwcNum = fwcMatch ? parseInt(fwcMatch[1], 10) : 0;
      if (isCc || fwcNum >= 9) {
        return { name: "Especiales (Fin)", order: 10 };
      }
      return { name: "Especiales (Inicio)", order: 0 };
    }
    const charCode = s.group_name.toUpperCase().charCodeAt(0);
    return { name: `Grupo ${s.group_name.toUpperCase()}`, order: charCode - 64 };
  };

  // Group, sort, and filter stickers for each sheet
  const groupedData = useMemo(() => {
    const ownedList: Sticker[] = [];
    const missingList: Sticker[] = [];
    const duplicateList: (Sticker & { duplicates: number })[] = [];

    stickers.forEach((s) => {
      const status = userStatus[s.id];
      const isOwned = status?.status === "owned" || status?.status === "duplicate";
      const isDuplicate = status?.status === "duplicate";

      if (isOwned) {
        ownedList.push(s);
      } else {
        missingList.push(s);
      }

      if (isDuplicate && status.duplicate_count > 0) {
        duplicateList.push({
          ...s,
          duplicates: status.duplicate_count,
        });
      }
    });

    const sortStickers = (list: Sticker[]) => {
      return [...list].sort((a, b) => {
        const grpA = getGroupInfo(a);
        const grpB = getGroupInfo(b);
        if (grpA.order !== grpB.order) return grpA.order - grpB.order;

        const countryA = a.country || a.source || "Especiales";
        const countryB = b.country || b.source || "Especiales";
        if (countryA !== countryB) return countryA.localeCompare(countryB);

        return getNumericPart(a.key_code || a.code) - getNumericPart(b.key_code || b.code);
      });
    };

    const sortedOwned = sortStickers(ownedList);
    const sortedMissing = sortStickers(missingList);
    
    // Custom sort for duplicates list
    const sortedDuplicates = [...duplicateList].sort((a, b) => {
      const grpA = getGroupInfo(a);
      const grpB = getGroupInfo(b);
      if (grpA.order !== grpB.order) return grpA.order - grpB.order;

      const countryA = a.country || a.source || "Especiales";
      const countryB = b.country || b.source || "Especiales";
      if (countryA !== countryB) return countryA.localeCompare(countryB);

      return getNumericPart(a.key_code || a.code) - getNumericPart(b.key_code || b.code);
    });

    // Grouping helper
    const buildGroupsMap = (list: Sticker[]) => {
      const map: Record<string, Record<string, Sticker[]>> = {};
      list.forEach((item) => {
        const groupName = getGroupInfo(item).name;
        const countryName = item.country || item.source || "Otros";

        if (!map[groupName]) map[groupName] = {};
        if (!map[groupName][countryName]) map[groupName][countryName] = [];
        map[groupName][countryName].push(item);
      });
      return map;
    };

    // Grouping helper for duplicates
    const buildDuplicatesGroupsMap = (list: (Sticker & { duplicates: number })[]) => {
      const map: Record<string, Record<string, (Sticker & { duplicates: number })[]>> = {};
      list.forEach((item) => {
        const groupName = getGroupInfo(item).name;
        const countryName = item.country || item.source || "Otros";

        if (!map[groupName]) map[groupName] = {};
        if (!map[groupName][countryName]) map[groupName][countryName] = [];
        map[groupName][countryName].push(item);
      });
      return map;
    };

    return {
      owned: buildGroupsMap(sortedOwned),
      missing: buildGroupsMap(sortedMissing),
      duplicates: buildDuplicatesGroupsMap(sortedDuplicates),
      totalOwned: ownedList.length,
      totalMissing: missingList.length,
      totalDuplicates: duplicateList.length,
    };
  }, [stickers, userStatus]);

  // Clean formatted date string
  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12 antialiased">
      {/* Printable page layout styles injected directly */}
      <style jsx global>{`
        @page {
          size: letter;
          margin: 1.5cm;
        }
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            background: transparent !important;
            padding: 0 !important;
            box-shadow: none !important;
            max-width: none !important;
            margin: 0 !important;
          }
          .print-page {
            page-break-after: always;
            break-after: page;
            color: black !important;
            min-height: auto !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 0 2cm 0 !important;
          }
          .print-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
            margin-bottom: 0 !important;
          }
          /* Ensure text colors are optimized for printer ink saving */
          .text-slate-400, .text-slate-500, .text-slate-600 {
            color: #4b5563 !important;
          }
          .text-emerald-400, .text-emerald-500 {
            color: #047857 !important;
          }
          .text-amber-400, .text-amber-500 {
            color: #d97706 !important;
          }
          .bg-slate-900, .bg-slate-800, .bg-slate-100 {
            background-color: transparent !important;
            border: 1px solid #e5e7eb !important;
          }
          .border-slate-800, .border-slate-700 {
            border-color: #d1d5db !important;
          }
        }
      `}</style>

      {/* Screen only navigation bar */}
      <header className="no-print sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href={`/collections/${collection.slug}`}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al checklist
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 md:inline">
              Vista previa lista para impresión
            </span>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-sm font-semibold text-white transition-all transform active:scale-95 shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Imprimir / Guardar PDF
            </button>
          </div>
        </div>
      </header>

      {/* Tip for users on screen */}
      <div className="no-print mx-auto max-w-3xl mt-6 px-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/80 shadow-lg">
          <p className="font-semibold text-amber-300">💡 Consejo para guardar como PDF:</p>
          <p className="mt-1">
            En la pantalla que se abrirá al hacer clic en <strong>Imprimir</strong>, cambia el destino de la impresora a <strong>"Guardar como PDF"</strong> o <strong>"Microsoft Print to PDF"</strong>. Asegúrate de habilitar los gráficos de fondo si deseas conservar los sombreados.
          </p>
        </div>
      </div>

      {/* Main Print Container */}
      <main className="print-container mx-auto max-w-3xl mt-8 px-4">
        
        {/* HOJA 1: STICKERS QUE YA TIENE */}
        <section className="print-page bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl text-slate-100">
          <div className="border-b border-slate-800 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Hoja 1 de 3</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">MIS STICKERS (YA TIENE)</h1>
                <p className="text-sm text-slate-400 mt-1">Álbum: {collection.name}</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Usuario: {userEmail}</p>
                <p>Fecha: {formattedDate}</p>
                <p className="font-semibold text-emerald-400 text-sm mt-1">Tengo: {groupedData.totalOwned} / {collection.total_count} ({Math.round((groupedData.totalOwned / collection.total_count) * 100)}%)</p>
              </div>
            </div>
          </div>

          {groupedData.totalOwned === 0 ? (
            <p className="text-center py-12 text-slate-500">Aún no has marcado ningún sticker en tu colección.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedData.owned).map(([groupName, countries]) => (
                <div key={groupName} className="border border-slate-800/60 rounded-xl p-4 bg-slate-950/20">
                  <h2 className="text-lg font-bold text-white mb-3 border-b border-slate-800 pb-1 flex items-center justify-between">
                    <span>{groupName}</span>
                  </h2>
                  <div className="space-y-4">
                    {Object.entries(countries).map(([countryName, items]) => (
                      <div key={countryName} className="space-y-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{countryName}</h3>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {items.map((sticker) => (
                            <span
                              key={sticker.id}
                              className="inline-block rounded bg-slate-800 border border-slate-700/60 text-emerald-400 font-semibold px-2 py-0.5 text-xs font-mono"
                              title={sticker.name}
                            >
                              {sticker.key_code || sticker.code}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* HOJA 2: STICKERS QUE LE FALTAN */}
        <section className="print-page bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl text-slate-100">
          <div className="border-b border-slate-800 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-400">Hoja 2 de 3</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">STICKERS FALTANTES (ME FALTAN)</h1>
                <p className="text-sm text-slate-400 mt-1">Álbum: {collection.name}</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Usuario: {userEmail}</p>
                <p>Fecha: {formattedDate}</p>
                <p className="font-semibold text-red-400 text-sm mt-1">Faltan: {groupedData.totalMissing} / {collection.total_count}</p>
              </div>
            </div>
          </div>

          {groupedData.totalMissing === 0 ? (
            <p className="text-center py-12 text-emerald-400 font-semibold">🎉 ¡Felicidades! Has completado el álbum entero.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedData.missing).map(([groupName, countries]) => (
                <div key={groupName} className="border border-slate-800/60 rounded-xl p-4 bg-slate-950/20">
                  <h2 className="text-lg font-bold text-white mb-3 border-b border-slate-800 pb-1">
                    {groupName}
                  </h2>
                  <div className="space-y-4">
                    {Object.entries(countries).map(([countryName, items]) => (
                      <div key={countryName} className="space-y-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{countryName}</h3>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {items.map((sticker) => (
                            <span
                              key={sticker.id}
                              className="inline-block rounded bg-slate-800 border border-slate-700/60 text-slate-300 font-semibold px-2 py-0.5 text-xs font-mono"
                              title={sticker.name}
                            >
                              {sticker.key_code || sticker.code}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* HOJA 3: STICKERS REPETIDOS */}
        <section className="print-page bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl text-slate-100">
          <div className="border-b border-slate-800 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Hoja 3 de 3</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">STICKERS REPETIDOS (REPETIDAS)</h1>
                <p className="text-sm text-slate-400 mt-1">Álbum: {collection.name}</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Usuario: {userEmail}</p>
                <p>Fecha: {formattedDate}</p>
                <p className="font-semibold text-amber-400 text-sm mt-1">Total Repetidos: {groupedData.totalDuplicates} cromos distintos</p>
              </div>
            </div>
          </div>

          {groupedData.totalDuplicates === 0 ? (
            <p className="text-center py-12 text-slate-500">No tienes stickers repetidos marcados en el sistema.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedData.duplicates).map(([groupName, countries]) => (
                <div key={groupName} className="border border-slate-800/60 rounded-xl p-4 bg-slate-950/20">
                  <h2 className="text-lg font-bold text-white mb-3 border-b border-slate-800 pb-1">
                    {groupName}
                  </h2>
                  <div className="space-y-4">
                    {Object.entries(countries).map(([countryName, items]) => (
                      <div key={countryName} className="space-y-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{countryName}</h3>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {items.map((sticker) => (
                            <span
                              key={sticker.id}
                              className="inline-flex items-center gap-1 rounded bg-slate-800 border border-slate-700/60 font-semibold px-2 py-0.5 text-xs font-mono"
                              title={sticker.name}
                            >
                              <span className="text-amber-400">{sticker.key_code || sticker.code}</span>
                              <span className="text-slate-500 font-bold bg-slate-900 border border-slate-850 px-1 rounded text-[10px]">
                                x{sticker.duplicates}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
