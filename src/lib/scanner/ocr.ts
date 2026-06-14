import Tesseract from "tesseract.js";
import { matchStickerFromOcr, type StickerMatchInput } from "@/lib/sticker-matcher";

let worker: Tesseract.Worker | null = null;

async function getWorker() {
  if (!worker) {
    worker = await Tesseract.createWorker("eng");
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ ",
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
    });
  }
  return worker;
}

export function preprocessCellForOcr(
  cellCanvas: HTMLCanvasElement
): HTMLCanvasElement {
  const processed = document.createElement("canvas");
  const ctx = processed.getContext("2d")!;

  const cropHeight = Math.max(24, Math.floor(cellCanvas.height * 0.35));
  processed.width = cellCanvas.width;
  processed.height = cropHeight;

  ctx.drawImage(
    cellCanvas,
    0,
    0,
    cellCanvas.width,
    cropHeight,
    0,
    0,
    cellCanvas.width,
    cropHeight
  );

  const imageData = ctx.getImageData(0, 0, processed.width, processed.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const boosted = gray > 140 ? 255 : gray < 90 ? 0 : gray > 200 ? 255 : 0;
    data[i] = boosted;
    data[i + 1] = boosted;
    data[i + 2] = boosted;
  }

  ctx.putImageData(imageData, 0, 0);
  return processed;
}

export async function recognizeCell(
  cellCanvas: HTMLCanvasElement
): Promise<{ text: string; confidence: number }> {
  const w = await getWorker();
  const processed = preprocessCellForOcr(cellCanvas);
  const { data } = await w.recognize(processed);
  const text = data.text.replace(/\s+/g, " ").trim();
  return { text, confidence: data.confidence / 100 };
}

export function resolveStickerFromOcr(
  text: string,
  candidates: StickerMatchInput[]
): StickerMatchInput | null {
  return matchStickerFromOcr(text, candidates);
}

export async function terminateOcr() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}
