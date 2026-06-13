"use client";

import { useRef, useState } from "react";
import { Camera, Upload, X } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
      }
    } catch {
      setError("No se pudo acceder a la cámara. Usa la opción de subir imagen.");
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
  }

  function takePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPreview(dataUrl);
    stopCamera();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      stopCamera();
    };
    reader.readAsDataURL(file);
  }

  function confirm() {
    if (preview) onCapture(preview);
  }

  function reset() {
    setPreview(null);
    setError(null);
    stopCamera();
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
          {error}
        </p>
      )}

      {!preview ? (
        <div className="space-y-4">
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
            <video
              ref={videoRef}
              className={`h-full w-full object-cover ${streaming ? "block" : "hidden"}`}
              playsInline
              muted
            />
            {!streaming && (
              <div className="flex h-full items-center justify-center text-slate-500">
                <Camera className="h-16 w-16 opacity-30" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {!streaming ? (
              <button
                onClick={startCamera}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400"
              >
                <Camera className="h-4 w-4" />
                Abrir cámara
              </button>
            ) : (
              <button
                onClick={takePhoto}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400"
              >
                Capturar foto
              </button>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
            >
              <Upload className="h-4 w-4" />
              Subir imagen
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={preview}
              alt="Vista previa"
              className="w-full rounded-xl border border-slate-700"
            />
            <button
              onClick={reset}
              className="absolute right-2 top-2 rounded-full bg-slate-900/80 p-2 text-slate-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={confirm}
            className="w-full rounded-lg bg-emerald-500 py-3 font-medium text-white hover:bg-emerald-400"
          >
            Analizar página
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
