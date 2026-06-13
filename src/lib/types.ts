export type StickerStatus = "owned" | "missing" | "duplicate";

export type FilterType = "all" | "pending" | "marked" | "duplicates";

export interface Collection {
  id: string;
  slug: string;
  name: string;
  total_count: number;
  year: number | null;
}

export interface Category {
  id: string;
  collection_id: string;
  name: string;
  sort_order: number;
}

export interface Sticker {
  id: string;
  collection_id: string;
  category_id: string;
  code: string;
  name: string;
  number: number | null;
  sort_order: number;
}

export interface UserSticker {
  id: string;
  user_id: string;
  collection_id: string;
  sticker_id: string;
  status: StickerStatus;
  duplicate_count: number;
}

export interface AlbumPage {
  id: string;
  collection_id: string;
  page_number: number;
  rows: number;
  cols: number;
  margin_top: number;
  margin_left: number;
  margin_bottom: number;
  margin_right: number;
}

export interface PageSticker {
  album_page_id: string;
  sticker_id: string;
  row_index: number;
  col_index: number;
}

export interface ScanCellResult {
  row: number;
  col: number;
  filled: boolean;
  ocrText: string | null;
  stickerId: string | null;
  stickerCode: string | null;
  stickerName: string | null;
  confidence: number;
  selected: boolean;
}

export interface ScanResult {
  pageNumber: number;
  rows: number;
  cols: number;
  cells: ScanCellResult[];
}
