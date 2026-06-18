export interface StickerMatchInput {
  id: string;
  code: string;
  key_code?: string | null;
  album_number?: string | null;
  name: string;
  number?: number | null;
}

function normalize(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatTeamCode(prefix: string, num: string): string | null {
  const n = parseInt(num, 10);
  if (Number.isNaN(n)) return null;
  return `${prefix} ${n}`;
}

export function parseOcrCandidates(text: string): string[] {
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const candidates = new Set<string>();
  candidates.add(cleaned);
  candidates.add(normalize(cleaned));

  const patterns = [
    /\b(FWC)\s*(\d{1,2})\b/g,
    /\b([A-Z]{3,4})\s*(\d{1,2})\b/g,
    /\b(\d{1,2})\b/g,
  ];

  for (const pattern of patterns) {
    for (const match of cleaned.matchAll(pattern)) {
      if (match.length === 3) {
        candidates.add(`${match[1]} ${parseInt(match[2], 10)}`);
        candidates.add(`${match[1]}${parseInt(match[2], 10)}`);
        candidates.add(normalize(`${match[1]}${match[2]}`));
      } else if (match.length === 2) {
        candidates.add(match[1]);
        candidates.add(match[1].padStart(2, "0"));
      }
    }
  }

  return [...candidates].filter(Boolean);
}

export function matchStickerFromOcr(
  text: string,
  stickers: StickerMatchInput[]
): StickerMatchInput | null {
  const candidates = parseOcrCandidates(text);
  if (candidates.length === 0) return null;

  const byKey = new Map<string, StickerMatchInput>();
  const byCode = new Map<string, StickerMatchInput>();
  const byAlbumNumber = new Map<string, StickerMatchInput>();

  for (const sticker of stickers) {
    if (sticker.key_code) byKey.set(normalize(sticker.key_code), sticker);
    byCode.set(normalize(sticker.code), sticker);
    if (sticker.album_number) byAlbumNumber.set(normalize(sticker.album_number), sticker);
    if (sticker.number != null) byAlbumNumber.set(normalize(String(sticker.number)), sticker);
  }

  for (const candidate of candidates) {
    const norm = normalize(candidate);
    if (byKey.has(norm)) return byKey.get(norm)!;
    if (byCode.has(norm)) return byCode.get(norm)!;
    if (byAlbumNumber.has(norm)) return byAlbumNumber.get(norm)!;
  }

  for (const candidate of candidates) {
    const fwc = candidate.match(/^FWC\s*(\d+)$/i);
    if (fwc) {
      const code = formatTeamCode("FWC", fwc[1]);
      if (code && byCode.has(normalize(code))) return byCode.get(normalize(code))!;
    }

    const team = candidate.match(/^([A-Z]{2,4})\s*(\d+)$/i);
    if (team) {
      const code = formatTeamCode(team[1], team[2]);
      if (code && byCode.has(normalize(code))) return byCode.get(normalize(code))!;
    }
  }

  return null;
}

export function matchStickerByPosition(
  row: number,
  col: number,
  pageStickers: { row_index: number; col_index: number; sticker_id: string }[],
  stickerById: Record<string, StickerMatchInput>
): StickerMatchInput | null {
  const mapping = pageStickers.find(
    (ps) => ps.row_index === row && ps.col_index === col
  );
  if (!mapping) return null;
  return stickerById[mapping.sticker_id] ?? null;
}
