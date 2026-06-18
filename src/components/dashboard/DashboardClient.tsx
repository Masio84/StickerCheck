"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Camera, Printer, Upload, X, Loader2, Save, RotateCcw, RotateCw, AlertTriangle, Info } from "lucide-react";
import Tesseract from "tesseract.js";
import type { Collection, Sticker, StickerStatus, AlbumPage, PageSticker } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { extractCells, cropCell } from "@/lib/scanner/grid";
import { detectFilled } from "@/lib/scanner/detect";

interface DashboardClientProps {
  collection: Collection;
  stickers: Sticker[];
  albumPages: AlbumPage[];
  pageStickers: PageSticker[];
  initialUserStatus: Record<string, { status: StickerStatus; duplicate_count: number }>;
  userEmail: string;
}

function resizeAndRotateImage(
  img: HTMLImageElement,
  rotation: number,
  maxDim: number = 800
): string {
  const canvas = document.createElement("canvas");
  let w = img.naturalWidth;
  let h = img.naturalHeight;

  if (w > maxDim || h > maxDim) {
    const scale = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  if (rotation === 90 || rotation === 270) {
    canvas.width = h;
    canvas.height = w;
  } else {
    canvas.width = w;
    canvas.height = h;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);

  return canvas.toDataURL("image/jpeg", 0.85);
}

function rotateFullResImage(img: HTMLImageElement, rotation: number): string {
  if (rotation === 0) return img.src;
  const canvas = document.createElement("canvas");
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  if (rotation === 90 || rotation === 270) {
    canvas.width = h;
    canvas.height = w;
  } else {
    canvas.width = w;
    canvas.height = h;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2);

  return canvas.toDataURL("image/jpeg", 0.85);
}

export function DashboardClient({
  collection,
  stickers,
  albumPages,
  pageStickers,
  initialUserStatus,
  userEmail,
}: DashboardClientProps) {
  const [userStatus, setUserStatus] = useState<Record<string, { status: StickerStatus; duplicate_count: number }>>(initialUserStatus);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [detectedCodes, setDetectedCodes] = useState<string[]>([]);
  const [detectedCountries, setDetectedCountries] = useState<string>("");
  const [editCodesText, setEditCodesText] = useState<string>("");
  const [selectedPageId, setSelectedPageId] = useState<string>(albumPages[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const selectedPage = useMemo(() => {
    if (!selectedPageId) return null;
    return albumPages.find((p) => p.id === selectedPageId) ?? null;
  }, [albumPages, selectedPageId]);

  const currentPageStickers = useMemo(() => {
    if (!selectedPage) return [];
    return pageStickers
      .filter((ps) => ps.album_page_id === selectedPage.id)
      .sort((a, b) => {
        if (a.row_index !== b.row_index) return a.row_index - b.row_index;
        return a.col_index - b.col_index;
      });
  }, [pageStickers, selectedPage]);

  const currentEditCodesSet = useMemo(() => {
    return new Set(
      editCodesText
        .split(/[\s,;]+/)
        .map((c) => c.trim().toUpperCase().replace(/\s+/g, ""))
        .filter(Boolean)
    );
  }, [editCodesText]);

  function handleToggleCell(code: string) {
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "");
    const currentCodes = editCodesText
      .split(/[\s,;]+/)
      .map((c) => c.trim().toUpperCase().replace(/\s+/g, ""))
      .filter(Boolean);

    const index = currentCodes.indexOf(cleanCode);
    if (index > -1) {
      currentCodes.splice(index, 1);
    } else {
      currentCodes.push(cleanCode);
    }
    setEditCodesText(currentCodes.join(", "));
  }

  async function handleRotateImage() {
    if (!previewImage || !selectedPage) return;
    setAnalyzing(true);
    setError(null);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Error al cargar la imagen para rotación."));
        img.src = previewImage;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo obtener el contexto de dibujo 2d.");

      // Rotate 90 degrees clockwise
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      const rotatedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setPreviewImage(rotatedDataUrl);

      // Re-run filled detection on the rotated image
      const codes = await runGridDetection(rotatedDataUrl, selectedPage);
      setDetectedCodes(codes);
      setEditCodesText(codes.join(", "));
    } catch (err: any) {
      console.error(err);
      setError("Error al rotar la imagen: " + (err.message || err));
    } finally {
      setAnalyzing(false);
    }
  }

  // 1. Calculate Stats
  const stats = useMemo(() => {
    const total = collection.total_count || stickers.length || 992;
    
    let tengo = 0;
    let repetidas = 0;

    Object.keys(userStatus).forEach((stickerId) => {
      const item = userStatus[stickerId];
      if (item.status === "owned" || item.status === "duplicate") {
        tengo++;
      }
      if (item.status === "duplicate" && item.duplicate_count > 0) {
        repetidas += item.duplicate_count;
      }
    });

    const faltan = Math.max(0, total - tengo);

    return {
      total,
      tengo,
      faltan,
      repetidas,
      percentage: Math.round((tengo / total) * 100),
    };
  }, [collection, stickers, userStatus]);

  // 2. Camera Controls
  async function startCamera() {
    setError(null);
    setPreviewImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setStreaming(true);
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo iniciar la cámara. Sube una imagen como alternativa.");
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPreviewImage(dataUrl);
    stopCamera();
    runOcrAnalysis(dataUrl);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreviewImage(dataUrl);
      stopCamera();
      runOcrAnalysis(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  // 3. Run filled detection by page grid
  const runGridDetection = (
    imageDataUrl: string,
    page: AlbumPage
  ): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const margins = {
            top: Number(page.margin_top) || 0.05,
            left: Number(page.margin_left) || 0.05,
            bottom: Number(page.margin_bottom) || 0.05,
            right: Number(page.margin_right) || 0.05,
          };

          const { regions, canvas } = extractCells(img, page.rows, page.cols, margins);
          const codes: string[] = [];

          const currentPageStickers = pageStickers.filter(
            (ps) => ps.album_page_id === page.id
          );
          const stickerById = Object.fromEntries(stickers.map((s) => [s.id, s]));

          regions.forEach((region) => {
            const cellCanvas = cropCell(canvas, region);
            const detection = detectFilled(cellCanvas);
            
            if (detection.filled) {
              const match = currentPageStickers.find(
                (ps) => ps.row_index === region.row && ps.col_index === region.col
              );
              if (match) {
                const sticker = stickerById[match.sticker_id];
                if (sticker) {
                  codes.push(sticker.key_code || sticker.code);
                }
              }
            }
          });
          resolve(codes);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("Error al cargar la imagen capturada."));
      img.src = imageDataUrl;
    });
  };

  // 4. OCR heading detection + visual grid check
  async function runOcrAnalysis(imageDataUrl: string) {
    setAnalyzing(true);
    setError(null);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Error al cargar la imagen capturada."));
        img.src = imageDataUrl;
      });

      let matchedPage: AlbumPage | null = null;
      let correctRotation = 0;

      // Rotations to test for vertical/sideways camera orientations:
      // - 0: Raw image
      // - 270: rotated 90 degrees CCW (fixes portrait double-page layout with left page on top)
      // - 90: rotated 90 degrees CW (fixes portrait double-page layout with right page on top)
      // - 180: upside-down
      const rotations = [0, 270, 90, 180];

      for (const rot of rotations) {
        // Create downscaled canvas for super fast OCR
        const ocrImageSrc = resizeAndRotateImage(img, rot, 800);
        
        // Run OCR
        const { data } = await Tesseract.recognize(ocrImageSrc, "eng");
        const cleanedText = data.text.toUpperCase();
        
        // Match country/section name
        for (const page of albumPages) {
          if (page.section_name) {
            const sectionUpper = page.section_name.toUpperCase();
            if (cleanedText.includes(sectionUpper)) {
              matchedPage = page;
              correctRotation = rot;
              break;
            }
          }
        }
        
        if (matchedPage) break;
      }

      if (!matchedPage) {
        setSelectedPageId("");
        setDetectedCodes([]);
        setDetectedCountries("");
        setEditCodesText("");
        setError("No pudimos identificar la sección automáticamente. Por favor selecciónala de la lista abajo.");
      } else {
        setSelectedPageId(matchedPage.id);

        // Auto-rotate the full-res preview image to landscape if a rotation was matching
        const finalImageUrl = rotateFullResImage(img, correctRotation);
        setPreviewImage(finalImageUrl);

        const codes = await runGridDetection(finalImageUrl, matchedPage);
        
        setDetectedCodes(codes);
        setDetectedCountries(matchedPage.section_name || "Especiales");
        setEditCodesText(codes.join(", "));
      }
    } catch (err: any) {
      console.error(err);
      setError("Error durante el análisis. Por favor selecciona el país/sección manualmente.");
      setEditCodesText("");
      setDetectedCountries("Error");
    } finally {
      setAnalyzing(false);
    }
  }

  // Handle manual dropdown change - instantly re-analyze the image
  async function handlePageChange(pageId: string) {
    const page = albumPages.find((p) => p.id === pageId);
    if (!page || !previewImage) return;

    setAnalyzing(true);
    setError(null);
    try {
      let finalImageUrl = previewImage;
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Error al cargar la imagen del preview."));
        img.src = previewImage;
      });

      const isImagePortrait = img.naturalHeight > img.naturalWidth;
      const isPageLandscape = (page.cols || 5) > (page.rows || 4);

      if (isImagePortrait && isPageLandscape) {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalHeight;
        canvas.height = img.naturalWidth;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
          finalImageUrl = canvas.toDataURL("image/jpeg", 0.85);
          setPreviewImage(finalImageUrl);
        }
      }

      const codes = await runGridDetection(finalImageUrl, page);
      setDetectedCodes(codes);
      setEditCodesText(codes.join(", "));
      setDetectedCountries(page.section_name || "Especiales");
      setSelectedPageId(pageId);
    } catch (err) {
      console.error(err);
      setError("Error al procesar la cuadrícula del país seleccionado.");
    } finally {
      setAnalyzing(false);
    }
  }

  // 5. Save Database Updates
  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // Parse current editable code list
      const enteredCodes = editCodesText
        .split(/[\s,;]+/)
        .map((c) => c.trim().toUpperCase().replace(/\s+/g, ""))
        .filter(Boolean);

      const stickersToSave: Sticker[] = [];
      const invalidCodes: string[] = [];

      // Look up codes
      const validCodesMap = new Map<string, Sticker>();
      stickers.forEach((s) => {
        if (s.key_code) {
          validCodesMap.set(s.key_code.toUpperCase().replace(/\s+/g, ""), s);
        }
        validCodesMap.set(s.code.toUpperCase().replace(/\s+/g, ""), s);
      });

      enteredCodes.forEach((code) => {
        const s = validCodesMap.get(code);
        if (s) {
          stickersToSave.push(s);
        } else {
          invalidCodes.push(code);
        }
      });

      if (enteredCodes.length > 0 && stickersToSave.length === 0) {
        throw new Error(`Códigos inválidos o no encontrados en la colección: ${invalidCodes.slice(0, 4).join(", ")}`);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión de usuario no encontrada.");

      const nextStatus = { ...userStatus };

      for (const sticker of stickersToSave) {
        const existing = nextStatus[sticker.id];
        let newStatus: StickerStatus = "owned";
        let newDuplicateCount = 0;

        if (existing) {
          newStatus = "duplicate";
          newDuplicateCount = existing.duplicate_count + 1;
        }

        const { error: upsertError } = await supabase.from("user_stickers").upsert(
          {
            user_id: user.id,
            collection_id: collection.id,
            sticker_id: sticker.id,
            status: newStatus,
            duplicate_count: newDuplicateCount,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,sticker_id" }
        );

        if (upsertError) throw upsertError;

        nextStatus[sticker.id] = {
          status: newStatus,
          duplicate_count: newDuplicateCount,
        };
      }

      // Insert scan session log
      await supabase.from("scan_sessions").insert({
        user_id: user.id,
        collection_id: collection.id,
        page_number: 1,
        results_json: {
          detected: detectedCodes,
          saved: stickersToSave.map((s) => s.key_code || s.code),
        },
      });

      setUserStatus(nextStatus);
      setScannerOpen(false);
      setPreviewImage(null);
      setDetectedCodes([]);
      setEditCodesText("");
      setDetectedCountries("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al guardar los stickers en tu cuenta.");
    } finally {
      setSaving(false);
    }
  }

  function handleCloseScanner() {
    stopCamera();
    setScannerOpen(false);
    setPreviewImage(null);
    setDetectedCodes([]);
    setEditCodesText("");
    setDetectedCountries("");
    setError(null);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 text-slate-100">
      {/* 1. Header user detail */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <span className="text-xs text-slate-500">Sesión iniciada como</span>
          <p className="text-sm font-semibold text-emerald-400">{userEmail}</p>
        </div>
      </div>

      {/* 2. Resumen Muy Pequeño */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl mb-8">
        <h2 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 text-center">Resumen de mi Álbum</h2>
        
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
            <span className="block text-[10px] text-emerald-400 font-bold uppercase">Tengo</span>
            <span className="text-xl font-extrabold text-white mt-1 block">{stats.tengo}</span>
            <span className="text-[10px] text-slate-500">{stats.percentage}%</span>
          </div>

          <div className="rounded-xl bg-slate-800/20 border border-slate-700/30 p-3">
            <span className="block text-[10px] text-slate-400 font-bold uppercase">Faltan</span>
            <span className="text-xl font-extrabold text-white mt-1 block">{stats.faltan}</span>
            <span className="text-[10px] text-slate-500">por conseguir</span>
          </div>

          <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3">
            <span className="block text-[10px] text-amber-400 font-bold uppercase">Repetidas</span>
            <span className="text-xl font-extrabold text-white mt-1 block">{stats.repetidas}</span>
            <span className="text-[10px] text-slate-500">duplicadas</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5">
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" 
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>
      </section>

      {/* 3. Acciones Principales */}
      <section className="flex flex-col gap-4">
        {/* BOTON GRANDE ESCANEAR */}
        <button
          onClick={() => {
            setScannerOpen(true);
            setPreviewImage(null);
            setSelectedPageId("");
            setDetectedCodes([]);
            setEditCodesText("");
            setDetectedCountries("");
            setError(null);
            startCamera();
          }}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 py-6 px-4 font-bold text-white shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all transform active:scale-98 hover:scale-[1.02] cursor-pointer"
        >
          <Camera className="h-10 w-10 animate-pulse" />
          <span className="text-lg">Escanear Álbum</span>
        </button>

        {/* BOTON GENERAR LISTADO (PDF) */}
        <button
          onClick={() => {
            window.open(`/collections/${collection.slug}/print`, "_blank");
          }}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 py-3 font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <Printer className="h-4 w-4" />
          Generar listado (PDF)
        </button>
      </section>

      {/* 4. Full-Screen Camera Scanner Modal */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          {/* Header */}
          <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <h3 className="text-sm font-semibold text-white">Escáner de Stickers</h3>
            <button
              onClick={handleCloseScanner}
              className="rounded-full bg-black/50 p-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Camera Viewfinder / Preview */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden">
            {previewImage ? (
              <div className="relative mx-auto inline-block border border-slate-800 rounded-lg overflow-hidden bg-slate-950 max-w-[90%] max-h-[70vh]">
                <img 
                  src={previewImage} 
                  alt="Captured" 
                  className="max-h-[45vh] sm:max-h-[50vh] w-auto block object-contain"
                />
                
                {/* Visual Interactive Grid Overlay */}
                {selectedPage && (
                  <div className="absolute inset-0 select-none">
                    {currentPageStickers.map((ps) => {
                      const sticker = stickers.find((s) => s.id === ps.sticker_id);
                      if (!sticker) return null;
                      const code = sticker.key_code || sticker.code;

                      // Calculate percentages
                      const leftMargin = (selectedPage.margin_left ?? 0.05) * 100;
                      const rightMargin = (selectedPage.margin_right ?? 0.05) * 100;
                      const topMargin = (selectedPage.margin_top ?? 0.05) * 100;
                      const bottomMargin = (selectedPage.margin_bottom ?? 0.05) * 100;
                      const gridW = 100 - leftMargin - rightMargin;
                      const gridH = 100 - topMargin - bottomMargin;
                      const cellW = gridW / selectedPage.cols;
                      const cellH = gridH / selectedPage.rows;

                      const left = leftMargin + ps.col_index * cellW;
                      const top = topMargin + ps.row_index * cellH;

                      const isDetected = currentEditCodesSet.has(code.toUpperCase().replace(/\s+/g, ""));

                      return (
                        <button
                          key={ps.sticker_id}
                          type="button"
                          onClick={() => handleToggleCell(code)}
                          className={`absolute pointer-events-auto border flex flex-col items-center justify-center text-[7px] sm:text-[9px] font-bold rounded transition-all cursor-pointer ${
                            isDetected
                              ? "border-emerald-500 bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-500"
                              : "border-slate-650 bg-black/30 text-slate-300 hover:border-white hover:bg-slate-800/40"
                          }`}
                          style={{
                            left: `${left}%`,
                            top: `${top}%`,
                            width: `${cellW}%`,
                            height: `${cellH}%`,
                          }}
                          title={`Alternar ${code}`}
                        >
                          <span className="truncate max-w-full px-0.5">{code}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Rotate Button Floating Overlay */}
                <div className="absolute bottom-2 right-2 z-20">
                  <button
                    type="button"
                    onClick={handleRotateImage}
                    className="flex items-center gap-1 bg-black/80 hover:bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-white transition-all cursor-pointer shadow-lg active:scale-95"
                    title="Rotar imagen 90°"
                  >
                    <RotateCw className="h-3 w-3 text-emerald-400" />
                    Rotar 90°
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                {streaming && (
                  <div className="absolute inset-0 border-[30px] sm:border-[50px] border-black/50 pointer-events-none flex flex-col items-center justify-center z-10">
                    <div className="w-full h-full border-2 border-dashed border-emerald-500/80 rounded-lg max-w-[85%] max-h-[80%] flex flex-col items-center justify-between p-4">
                      <span className="bg-black/70 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold text-emerald-400">
                        ENFOQUE: PÁGINA COMPLETA
                      </span>
                      <span className="bg-black/70 px-3 py-1.5 rounded-full text-[10px] sm:text-xs text-center text-slate-300 max-w-[95%]">
                        Coloca la página del álbum horizontal y alineada en este recuadro.
                      </span>
                    </div>
                  </div>
                )}
                {!streaming && (
                  <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                    <span className="text-xs">Cargando cámara...</span>
                  </div>
                )}
              </>
            )}

            {/* OCR Analyzing Loader */}
            {analyzing && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-6 z-25">
                <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
                <h4 className="mt-4 text-lg font-bold text-white">Analizando foto...</h4>
                <p className="text-xs text-slate-400 mt-2 max-w-xs">
                  Leyendo los códigos de stickers de la página y detectando los países.
                </p>
              </div>
            )}
          </div>

          {/* OCR Review / Editable Editor UI */}
          {!analyzing && previewImage && (
            <div className="bg-slate-900 border-t border-slate-800 p-6 flex flex-col max-h-[60vh] overflow-y-auto">
              <h4 className="font-bold text-white text-base">Resultado del Análisis</h4>

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-300">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-4 space-y-3">
                {/* 1. Page/Section selector Dropdown */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                    País / Sección del Álbum
                  </label>
                  <select
                    value={selectedPageId}
                    onChange={(e) => handlePageChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>-- Selecciona un país/sección --</option>
                    {albumPages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.section_name || `Página ${page.page_number}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Detected count */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stickers Pegados Detectados</span>
                  <p className="text-sm font-semibold text-emerald-400 mt-0.5">{detectedCodes.length} stickers encontrados</p>
                </div>

                {/* 3. Text area for editing codes */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Editar Listado (Separa códigos por comas)
                  </span>
                  <textarea
                    rows={3}
                    value={editCodesText}
                    onChange={(e) => setEditCodesText(e.target.value)}
                    placeholder="Escribe códigos de stickers (ej. MEX5, MEX6, FWC1, CC2)"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm font-mono text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[9px] text-slate-500 mt-1">
                    Puedes escribir los códigos a mano, borrar o corregir lecturas.
                  </span>
                </div>
              </div>

              {/* Review Control Actions */}
              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-emerald-500 py-3 font-semibold text-white hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? "Guardando..." : "Guardar stickers"}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setPreviewImage(null);
                      startCamera();
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 py-2.5 text-xs text-slate-300 hover:bg-slate-700 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Tomar de nuevo
                  </button>
                  <button
                    onClick={handleCloseScanner}
                    className="rounded-lg border border-slate-750 bg-slate-950/40 py-2.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Camera Capture Actions Overlay */}
          {!previewImage && (
            <div className="absolute bottom-0 inset-x-0 h-32 flex items-center justify-between px-10 bg-gradient-to-t from-black/80 to-transparent no-print">
              {/* File Upload Fallback Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-slate-800/80 p-3 text-slate-300 hover:text-white cursor-pointer shadow"
                title="Subir archivo"
              >
                <Upload className="h-5 w-5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Semitransparent Round Capture Button */}
              <button
                onClick={capturePhoto}
                disabled={!streaming}
                className="w-20 h-20 rounded-full border-4 border-white/60 bg-white/30 active:bg-white/50 hover:bg-white/40 flex items-center justify-center cursor-pointer shadow-lg disabled:opacity-30"
                title="Capturar foto"
              >
                <div className="w-14 h-14 rounded-full bg-white/80 active:bg-white" />
              </button>

              {/* Space holder */}
              <div className="w-11" />
            </div>
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}
