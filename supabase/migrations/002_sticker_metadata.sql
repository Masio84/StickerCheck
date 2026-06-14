-- Add sticker metadata from full album CSV and section info on pages

alter table public.stickers
  add column if not exists key_code text,
  add column if not exists album_number text,
  add column if not exists country text,
  add column if not exists country_code text,
  add column if not exists group_name text,
  add column if not exists sticker_type text,
  add column if not exists source text;

alter table public.album_pages
  add column if not exists section_name text;

create index if not exists idx_stickers_key_code on public.stickers(collection_id, key_code);
create index if not exists idx_stickers_album_number on public.stickers(collection_id, album_number);
