import Tesseract from "tesseract.js";

let worker: Tesseract.Worker | null = null;

async function getWorker() {
  if (!worker) {
    worker = await Tesseract.createWorker("eng");
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ ",
    });
  }
  return worker;
}

export async function recognizeCell(
  cellCanvas: HTMLCanvasElement
): Promise<{ text: string; confidence: number }> {
  const w = await getWorker();
  const { data } = await w.recognize(cellCanvas);
  const text = data.text.replace(/\s+/g, " ").trim();
  return { text, confidence: data.confidence / 100 };
}

export function parseStickerCode(text: string): string | null {
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim();
  if (!cleaned) return null;

  const patterns = [
    /FWC\s*(\d+)/,
    /PAN\s*(\d+)/,
    /([A-Z]{2,4})\s*(\d+)/,
    /^(\d+)$/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      if (match.length === 2 && /^\d+$/.test(match[1])) {
        return match[1];
      }
      if (match.length === 3) {
        return `${match[1]} ${match[2]}`;
      }
    }
  }

  return cleaned.length <= 10 ? cleaned : null;
}

export async function terminateOcr() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}
