export interface SeedSticker {
  code: string;
  name: string;
  number: number;
}

export interface SeedCategory {
  name: string;
  stickers: SeedSticker[];
}

export const worldCup2026Seed: SeedCategory[] = [
  {
    name: "PANINI",
    stickers: [
      { code: "00", name: "PANINI LOGO", number: 0 },
    ],
  },
  {
    name: "FIFA WORLD CUP",
    stickers: [
      { code: "FWC 1", name: "WC LOGO", number: 1 },
      { code: "FWC 2", name: "OFFICIAL MASCOT", number: 2 },
      { code: "FWC 3", name: "OFFICIAL BALL", number: 3 },
      { code: "FWC 4", name: "TROPHY", number: 4 },
      { code: "FWC 5", name: "HOST CITIES", number: 5 },
      { code: "FWC 6", name: "STADIUMS", number: 6 },
      { code: "FWC 7", name: "HISTORY", number: 7 },
      { code: "FWC 8", name: "FAIR PLAY", number: 8 },
    ],
  },
  {
    name: "TEAM SET - ARGENTINA",
    stickers: Array.from({ length: 20 }, (_, i) => ({
      code: `ARG ${i + 1}`,
      name: `Argentina Player ${i + 1}`,
      number: 9 + i,
    })),
  },
  {
    name: "TEAM SET - BRAZIL",
    stickers: Array.from({ length: 20 }, (_, i) => ({
      code: `BRA ${i + 1}`,
      name: `Brazil Player ${i + 1}`,
      number: 29 + i,
    })),
  },
  {
    name: "TEAM SET - SPAIN",
    stickers: Array.from({ length: 20 }, (_, i) => ({
      code: `ESP ${i + 1}`,
      name: `Spain Player ${i + 1}`,
      number: 49 + i,
    })),
  },
  {
    name: "TEAM SET - FRANCE",
    stickers: Array.from({ length: 20 }, (_, i) => ({
      code: `FRA ${i + 1}`,
      name: `France Player ${i + 1}`,
      number: 69 + i,
    })),
  },
  {
    name: "TEAM SET - GERMANY",
    stickers: Array.from({ length: 20 }, (_, i) => ({
      code: `GER ${i + 1}`,
      name: `Germany Player ${i + 1}`,
      number: 89 + i,
    })),
  },
  {
    name: "TEAM SET - ENGLAND",
    stickers: Array.from({ length: 20 }, (_, i) => ({
      code: `ENG ${i + 1}`,
      name: `England Player ${i + 1}`,
      number: 109 + i,
    })),
  },
  {
    name: "TEAM SET - MEXICO",
    stickers: Array.from({ length: 20 }, (_, i) => ({
      code: `MEX ${i + 1}`,
      name: `Mexico Player ${i + 1}`,
      number: 129 + i,
    })),
  },
  {
    name: "TEAM SET - USA",
    stickers: Array.from({ length: 20 }, (_, i) => ({
      code: `USA ${i + 1}`,
      name: `USA Player ${i + 1}`,
      number: 149 + i,
    })),
  },
  {
    name: "TEAM SET - PORTUGAL",
    stickers: Array.from({ length: 20 }, (_, i) => ({
      code: `POR ${i + 1}`,
      name: `Portugal Player ${i + 1}`,
      number: 169 + i,
    })),
  },
  {
    name: "SPECIAL STICKERS",
    stickers: Array.from({ length: 50 }, (_, i) => ({
      code: `SPC ${i + 1}`,
      name: `Special Sticker ${i + 1}`,
      number: 189 + i,
    })),
  },
];

export function getTotalStickerCount(): number {
  return worldCup2026Seed.reduce((sum, cat) => sum + cat.stickers.length, 0);
}

export const albumPageLayouts = [
  { page_number: 1, rows: 1, cols: 1, sticker_codes: ["00"] },
  {
    page_number: 2,
    rows: 2,
    cols: 4,
    sticker_codes: ["FWC 1", "FWC 2", "FWC 3", "FWC 4", "FWC 5", "FWC 6", "FWC 7", "FWC 8"],
  },
  {
    page_number: 3,
    rows: 4,
    cols: 5,
    sticker_codes: Array.from({ length: 20 }, (_, i) => `ARG ${i + 1}`),
  },
  {
    page_number: 4,
    rows: 4,
    cols: 5,
    sticker_codes: Array.from({ length: 20 }, (_, i) => `BRA ${i + 1}`),
  },
];
