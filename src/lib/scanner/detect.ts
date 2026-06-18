export interface FillDetectionResult {
  filled: boolean;
  variance: number;
  edgeDensity: number;
  confidence: number;
  dominantRatio?: number;
}

export function detectFilled(cellCanvas: HTMLCanvasElement): FillDetectionResult {
  const ctx = cellCanvas.getContext("2d")!;
  const { width, height } = cellCanvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let innerPixelCount = 0;

  // Shave off 15% of borders to ignore gridlines and slight alignment offsets
  const startX = Math.floor(width * 0.15);
  const endX = Math.floor(width * 0.85);
  const startY = Math.floor(height * 0.15);
  const endY = Math.floor(height * 0.85);

  const bins = new Int32Array(512);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      sumR += r;
      sumG += g;
      sumB += b;
      innerPixelCount++;

      // Color binning: 8 bins per channel (32 levels per bin)
      const rBin = Math.floor(r / 32);
      const gBin = Math.floor(g / 32);
      const bBin = Math.floor(b / 32);
      const binIdx = rBin * 64 + gBin * 8 + bBin;
      bins[binIdx]++;
    }
  }

  const avgR = sumR / innerPixelCount;
  const avgG = sumG / innerPixelCount;
  const avgB = sumB / innerPixelCount;

  let variance = 0;
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * width + x) * 4;
      const dr = data[idx] - avgR;
      const dg = data[idx + 1] - avgG;
      const db = data[idx + 2] - avgB;
      variance += dr * dr + dg * dg + db * db;
    }
  }
  variance /= innerPixelCount;

  let edgeCount = 0;
  const threshold = 30;

  for (let y = startY + 1; y < endY - 1; y++) {
    for (let x = startX + 1; x < endX - 1; x++) {
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

  const edgeDensity = edgeCount / innerPixelCount;

  // Find the top 2 most frequent color bins
  let max1 = 0;
  let max2 = 0;
  for (let i = 0; i < bins.length; i++) {
    const count = bins[i];
    if (count > max1) {
      max2 = max1;
      max1 = count;
    } else if (count > max2) {
      max2 = count;
    }
  }

  const top2Ratio = (max1 + max2) / innerPixelCount;
  const isSolidBackground = top2Ratio > 0.45;

  // Colorful empty slots with large white text "26" have high variance but low edge density.
  // Pasted stickers have high variance and high edge density.
  // Requiring BOTH variance > 2000 AND edgeDensity > 0.07 AND NOT having a solid dominant background
  // dramatically increases accuracy.
  const filled = variance > 2000 && edgeDensity > 0.07 && !isSolidBackground;
  const confidence = Math.min(
    1,
    (variance / 4000) * 0.5 + (edgeDensity / 0.15) * 0.5
  );

  return { filled, variance, edgeDensity, confidence, dominantRatio: top2Ratio };
}

