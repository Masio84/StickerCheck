import { readFileSync } from "fs";
import { join } from "path";

export interface CsvStickerRow {
  orden: number;
  clave: string;
  numeroAlbum: string;
  nombre: string;
  pais: string;
  codigoPais: string;
  grupo: string;
  seccionAlbum: string;
  tipo: string;
  origen: string;
  code: string;
}

export interface AlbumSection {
  sectionName: string;
  pageNumber: number;
  rows: number;
  cols: number;
  stickers: CsvStickerRow[];
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  fields.push(current.trim());
  return fields;
}

export function parseAlbumCsv(csvPath: string): CsvStickerRow[] {
  const content = readFileSync(csvPath, "utf8").trim();
  const lines = content.split(/\r?\n/).slice(1);

  return lines.map((line) => {
    const [
      orden,
      clave,
      numeroAlbum,
      nombre,
      pais,
      codigoPais,
      grupo,
      seccionAlbum,
      tipo,
      origen,
    ] = parseCsvLine(line);

    return {
      orden: parseInt(orden, 10),
      clave: clave.trim(),
      numeroAlbum: numeroAlbum.trim(),
      nombre: nombre.trim(),
      pais: pais.trim(),
      codigoPais: codigoPais.trim(),
      grupo: grupo.trim(),
      seccionAlbum: seccionAlbum.trim(),
      tipo: tipo.trim(),
      origen: origen.trim(),
      code: numeroAlbum.trim(),
    };
  });
}

export function gridForCount(count: number): { rows: number; cols: number } {
  if (count <= 1) return { rows: 1, cols: 1 };
  if (count >= 18 && count <= 20) {
    return { rows: 3, cols: 10 };
  }
  if (count <= 8) return { rows: 2, cols: 4 };
  if (count <= 12) return { rows: 3, cols: 4 };
  return { rows: Math.ceil(count / 5), cols: 5 };
}

export function buildAlbumSections(rows: CsvStickerRow[]): AlbumSection[] {
  const sections: AlbumSection[] = [];
  let currentSection = "";
  let buffer: CsvStickerRow[] = [];

  for (const row of rows) {
    if (row.seccionAlbum !== currentSection) {
      if (buffer.length > 0) {
        const { rows: gridRows, cols: gridCols } = gridForCount(buffer.length);
        sections.push({
          sectionName: currentSection,
          pageNumber: sections.length + 1,
          rows: gridRows,
          cols: gridCols,
          stickers: buffer,
        });
      }
      currentSection = row.seccionAlbum;
      buffer = [row];
    } else {
      buffer.push(row);
    }
  }

  if (buffer.length > 0) {
    const { rows: gridRows, cols: gridCols } = gridForCount(buffer.length);
    sections.push({
      sectionName: currentSection,
      pageNumber: sections.length + 1,
      rows: gridRows,
      cols: gridCols,
      stickers: buffer,
    });
  }

  return sections;
}

export function getDefaultCsvPath(): string {
  return join(process.cwd(), "data", "world-cup-2026-panini.csv");
}
