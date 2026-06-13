"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import type {
  AlbumPage,
  Collection,
  PageSticker,
  ScanCellResult,
  Sticker,
} from "@/lib/types";
import { CameraCapture } from "@/components/scanner/CameraCapture";
import { PageSelector } from "@/components/scanner/PageSelector";
import { ScanReview } from "@/components/scanner/ScanReview";
import { cropCell, extractCells } from "@/lib/scanner/grid";
import { detectFilled } from "@/lib/scanner/detect";
import { parseStickerCode, recognizeCell } from "@/lib/scanner/ocr";
import { createClient } from "@/lib/supabase/client";

interface ScannerClientProps {
  collection: Collection;
  stickers: Sticker[];
  albumPages: AlbumPage[];
  pageStickers: (PageSticker & { sticker?: Sticker })[];
}

type Step = "setup" | "capture" | "processing" | "review";

export function ScannerClient({
  collection,
  stickers,
  albumPages,
  pageStickers,
}: ScannerClientProps) {
  const [step, setStep] = useState<Step>("setup");
  const [pageNumber, setPageNumber] = useState(1);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [cells, setCells] = useState<ScanCellResult[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const stickerByCode = Object.fromEntries(stickers.map((s) => [s.code, s]));
  const stickerById = Object.fromEntries(stickers.map((s) => [s.id, s]));

  const applyPageLayout = useCallback(
    (page: number) => {
      const albumPage = albumPages.find((p) => p.page_number === page);
      if (albumPage) {
        setRows(albumPage.rows);
        setCols(albumPage.cols);
      }
    },
    [albumPages]
  );

  const handlePageChange = (page: number) => {
    setPageNumber(page);
    applyPageLayout(page);
  };

  const getStickerForCell = (
    row: number,
    col: number,
    ocrCode: string | null
  ): Sticker | null => {
    const page = albumPages.find((p) => p.page_number === pageNumber);
    if (page) {
      const mapping = pageStickers.find(
        (ps) =>
          ps.album_page_id === page.id &&
          ps.row_index === row &&
          ps.col_index === col
      );
      if (mapping?.sticker_id) return stickerById[mapping.sticker_id] ?? null;
    }

    if (ocrCode) {
      const direct = stickerByCode[ocrCode];
      if (direct) return direct;
      const fuzzy = stickers.find(
        (s) =>
          s.code.replace(/\s/g, "") === ocrCode.replace(/\s/g, "") ||
          String(s.number) === ocrCode
      );
      if (fuzzy) return fuzzy;
    }

    return null;
  };

  const processImage = async (imageDataUrl: string) => {
    setStep("processing");
    setError(null);

    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageDataUrl;
      });

      const { regions, canvas } = extractCells(img, rows, cols);
      const results: ScanCellResult[] = [];

      for (const region of regions) {
        const cellCanvas = cropCell(canvas, region);
        const detection = detectFilled(cellCanvas);

        let ocrText: string | null = null;
        let ocrConfidence = 0;

        if (detection.filled) {
          try {
            const ocr = await recognizeCell(cellCanvas);
            ocrText = parseStickerCode(ocr.text);
            ocrConfidence = ocr.confidence;
          } catch {
            ocrText = null;
          }
        }

        const sticker = detection.filled
          ? getStickerForCell(region.row, region.col, ocrText)
          : null;

        results.push({
          row: region.row,
          col: region.col,
          filled: detection.filled,
          ocrText,
          stickerId: sticker?.id ?? null,
          stickerCode: sticker?.code ?? ocrText,
          stickerName: sticker?.name ?? null,
          confidence: detection.filled
            ? Math.max(detection.confidence, ocrConfidence)
            : 0,
          selected: detection.filled && !!sticker,
        });
      }

      setCells(results);
      setStep("review");
    } catch (err) {
      setError("Error al procesar la imagen. Intenta de nuevo.");
      setStep("capture");
      console.error(err);
    }
  };

  const handleToggle = (row: number, col: number) => {
    setCells((prev) =>
      prev.map((c) =>
        c.row === row && c.col === col ? { ...c, selected: !c.selected } : c
      )
    );
  };

  const handleConfirm = async () => {
    setSaving(true);
    const selected = cells.filter((c) => c.selected && c.stickerId);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    for (const cell of selected) {
      await supabase.from("user_stickers").upsert(
        {
          user_id: user.id,
          collection_id: collection.id,
          sticker_id: cell.stickerId!,
          status: "owned",
          duplicate_count: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,sticker_id" }
      );
    }

    await supabase.from("scan_sessions").insert({
      user_id: user.id,
      collection_id: collection.id,
      page_number: pageNumber,
      results_json: { cells: selected },
    });

    setSaving(false);
    window.location.href = `/collections/${collection.slug}`;
  };

  return (
    <div>
      <Link
        href={`/collections/${collection.slug}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al checklist
      </Link>

      <h1 className="text-2xl font-bold text-white">Escanear álbum</h1>
      <p className="mt-2 text-slate-400">
        Fotografía una página de tu álbum para detectar cromos pegados
      </p>

      <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/80">
        Consejos: usa buena luz, mantén la cámara paralela a la página y
        ajusta filas/columnas según tu álbum.
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-8">
        {step === "setup" && (
          <div className="space-y-6">
            <PageSelector
              pageNumber={pageNumber}
              rows={rows}
              cols={cols}
              onPageChange={handlePageChange}
              onGridChange={(r, c) => {
                setRows(r);
                setCols(c);
              }}
            />
            <button
              onClick={() => setStep("capture")}
              className="w-full rounded-lg bg-emerald-500 py-3 font-medium text-white hover:bg-emerald-400"
            >
              Continuar a captura
            </button>
          </div>
        )}

        {step === "capture" && (
          <div className="space-y-4">
            <PageSelector
              pageNumber={pageNumber}
              rows={rows}
              cols={cols}
              onPageChange={handlePageChange}
              onGridChange={(r, c) => {
                setRows(r);
                setCols(c);
              }}
            />
            <CameraCapture onCapture={processImage} />
            <button
              onClick={() => setStep("setup")}
              className="text-sm text-slate-500 hover:text-slate-300"
            >
              Volver
            </button>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
            <p className="mt-4 text-slate-400">Analizando página...</p>
            <p className="text-sm text-slate-600">
              Detectando cromos y leyendo números
            </p>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <ScanReview
              cells={cells}
              onToggle={handleToggle}
              onConfirm={handleConfirm}
              saving={saving}
            />
            <button
              onClick={() => {
                setCells([]);
                setStep("capture");
              }}
              className="text-sm text-slate-500 hover:text-slate-300"
            >
              Escanear otra foto
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
