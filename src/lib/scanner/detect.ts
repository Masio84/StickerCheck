export interface FillDetectionResult {
  filled: boolean;
  variance: number;
  edgeDensity: number;
  confidence: number;
}

export function detectFilled(cellCanvas: HTMLCanvasElement): FillDetectionResult {
  const ctx = cellCanvas.getContext("2d")!;
  const { width, height } = cellCanvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  const pixelCount = width * height;

  for (let i = 0; i < data.length; i += 4) {
    sumR += data[i];
    sumG += data[i + 1];
    sumB += data[i + 2];
  }

  const avgR = sumR / pixelCount;
  const avgG = sumG / pixelCount;
  const avgB = sumB / pixelCount;

  let variance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - avgR;
    const dg = data[i + 1] - avgG;
    const db = data[i + 2] - avgB;
    variance += dr * dr + dg * dg + db * db;
  }
  variance /= pixelCount;

  let edgeCount = 0;
  const threshold = 30;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const gray =
        (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const rightIdx = idx + 4;
      const downIdx = idx + width * 4;
      const rightGray =
        (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
      const downGray =
        (data[downIdx] + data[downIdx + 1] + data[downIdx + 2]) / 3;

      if (
        Math.abs(gray - rightGray) > threshold ||
        Math.abs(gray - downGray) > threshold
      ) {
        edgeCount++;
      }
    }
  }

  const edgeDensity = edgeCount / pixelCount;
  const filled = variance > 800 || edgeDensity > 0.08;
  const confidence = Math.min(
    1,
    (variance / 2000) * 0.6 + (edgeDensity / 0.15) * 0.4
  );

  return { filled, variance, edgeDensity, confidence };
}
