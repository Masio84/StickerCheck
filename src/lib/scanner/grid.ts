export interface GridMargins {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export interface CellRegion {
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function extractCells(
  image: HTMLImageElement | HTMLCanvasElement,
  rows: number,
  cols: number,
  margins: GridMargins = { top: 0.05, left: 0.05, bottom: 0.05, right: 0.05 }
): { regions: CellRegion[]; canvas: HTMLCanvasElement } {
  const sourceCanvas = document.createElement("canvas");
  const sourceCtx = sourceCanvas.getContext("2d")!;

  const width =
    image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const height =
    image instanceof HTMLImageElement ? image.naturalHeight : image.height;

  sourceCanvas.width = width;
  sourceCanvas.height = height;
  sourceCtx.drawImage(image, 0, 0, width, height);

  const contentX = width * margins.left;
  const contentY = height * margins.top;
  const contentW = width * (1 - margins.left - margins.right);
  const contentH = height * (1 - margins.top - margins.bottom);

  const cellW = contentW / cols;
  const cellH = contentH / rows;
  const regions: CellRegion[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      regions.push({
        row,
        col,
        x: Math.round(contentX + col * cellW),
        y: Math.round(contentY + row * cellH),
        width: Math.round(cellW),
        height: Math.round(cellH),
      });
    }
  }

  return { regions, canvas: sourceCanvas };
}

export function cropCell(
  sourceCanvas: HTMLCanvasElement,
  region: CellRegion
): HTMLCanvasElement {
  const cellCanvas = document.createElement("canvas");
  const ctx = cellCanvas.getContext("2d")!;

  cellCanvas.width = region.width;
  cellCanvas.height = region.height;
  ctx.drawImage(
    sourceCanvas,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height
  );

  return cellCanvas;
}
