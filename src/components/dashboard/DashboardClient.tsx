"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Camera, Printer, Upload, X, Loader2, Save, RotateCcw, AlertTriangle } from "lucide-react";
import Tesseract from "tesseract.js";
import type { Collection, Sticker, StickerStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface DashboardClientProps {
  collection: Collection;
  stickers: Sticker[];
  initialUserStatus: Record<string, { status: StickerStatus; duplicate_count: number }>;
  userEmail: string;
}

export function DashboardClient({
  collection,
  stickers,
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

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

  // 3. OCR & Code Extraction
  async function runOcrAnalysis(imageDataUrl: string) {
    setAnalyzing(true);
    setError(null);
    try {
      const { data } = await Tesseract.recognize(imageDataUrl, "eng");
      const text = data.text;
      
      // Extract matches
      const codes = extractCodesFromText(text);
      setDetectedCodes(codes);

      // Extract countries
      const countryNames = new Set<string>();
      codes.forEach((code) => {
        const s = stickers.find((item) => (item.key_code || item.code).toUpperCase() === code);
        if (s) {
          countryNames.add(s.country || s.source || "Especiales");
        }
      });
      
      const countriesStr = countryNames.size > 0 
        ? [...countryNames].join(", ") 
        : "No identificado (Ninguno)";
        
      setDetectedCountries(countriesStr);
      setEditCodesText(codes.join(", "));
    } catch (err: any) {
      console.error(err);
      setError("Error durante la lectura del OCR. Por favor ingresa los códigos manualmente.");
      setEditCodesText("");
      setDetectedCountries("Error");
    } finally {
      setAnalyzing(false);
    }
  }

  function extractCodesFromText(text: string): string[] {
    const cleaned = text.toUpperCase();
    
    // Create map of normalized sticker codes to actual codes
    const validCodesMap = new Map<string, string>();
    stickers.forEach((s) => {
      const key = (s.key_code || s.code).toUpperCase().replace(/\s+/g, "");
      validCodesMap.set(key, s.key_code || s.code);
    });

    const detected = new Set<string>();
    
    // Regex for FWC, CC, and standard 3-letter codes like MEX, RSA, KOR, CZE
    const regex = /\b(00|FWC\d+|CC\d+|[A-Z]{3}\d+)\b/g;
    
    // Normalize spaces: e.g. "MEX 5" -> "MEX5"
    const normalizedText = cleaned.replace(/\b(FWC|CC|[A-Z]{3})\s*(\d+)\b/g, "$1$2");
    
    const matches = normalizedText.match(regex) || [];
    matches.forEach((m) => {
      const norm = m.replace(/\s+/g, "");
      if (validCodesMap.has(norm)) {
        detected.add(validCodesMap.get(norm)!);
      }
    });

    // Substring backup search within spaces
    const words = cleaned.split(/[\s,.;:!?()]+/);
    words.forEach((word) => {
      const m = word.match(/(00|FWC\d+|CC\d+|[A-Z]{3}\d+)/);
      if (m && m[1]) {
        if (validCodesMap.has(m[1])) {
          detected.add(validCodesMap.get(m[1])!);
        }
      }
    });

    return [...detected];
  }

  // 4. Save Database Updates
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
    <div className="mx-auto max-w-xl px-4 py-8">
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
              <img 
                src={previewImage} 
                alt="Captured" 
                className="w-full h-full object-contain"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
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
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-6">
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
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-4 space-y-3">
                {/* 1. Country Display */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">País / Sección Detectado</span>
                  <p className="text-sm font-semibold text-emerald-400 mt-0.5">{detectedCountries || "Identificando..."}</p>
                </div>

                {/* 2. Detected count */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stickers Detectados</span>
                  <p className="text-sm font-semibold text-white mt-0.5">{detectedCodes.length} stickers encontrados</p>
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
                    Puedes agregar cromos faltantes o borrar lecturas incorrectas.
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

              {/* Space holder or gallery button */}
              <div className="w-11" />
            </div>
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}
