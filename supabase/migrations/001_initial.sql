-- StickerCheck initial schema

create extension if not exists "uuid-ossp";

-- Catalog
create table public.collections (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  total_count integer not null default 0,
  year integer,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (collection_id, name)
);

create table public.stickers (
  id uuid primary key default uuid_generate_v4(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  code text not null,
  name text not null,
  number integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (collection_id, code)
);

create table public.album_pages (
  id uuid primary key default uuid_generate_v4(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  page_number integer not null,
  rows integer not null default 3,
  cols integer not null default 3,
  margin_top numeric not null default 0.05,
  margin_left numeric not null default 0.05,
  margin_bottom numeric not null default 0.05,
  margin_right numeric not null default 0.05,
  layout_json jsonb,
  created_at timestamptz not null default now(),
  unique (collection_id, page_number)
);

create table public.page_stickers (
  id uuid primary key default uuid_generate_v4(),
  album_page_id uuid not null references public.album_pages(id) on delete cascade,
  sticker_id uuid not null references public.stickers(id) on delete cascade,
  row_index integer not null,
  col_index integer not null,
  unique (album_page_id, row_index, col_index),
  unique (album_page_id, sticker_id)
);

-- User progress
create table public.user_collections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, collection_id)
);

create type public.sticker_status as enum ('owned', 'missing', 'duplicate');

create table public.user_stickers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  sticker_id uuid not null references public.stickers(id) on delete cascade,
  status public.sticker_status not null default 'missing',
  duplicate_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, sticker_id)
);

create table public.scan_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  page_number integer not null,
  image_path text,
  results_json jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_stickers_collection on public.stickers(collection_id);
create index idx_stickers_category on public.stickers(category_id);
create index idx_user_stickers_user on public.user_stickers(user_id);
create index idx_user_stickers_collection on public.user_stickers(collection_id);
create index idx_categories_collection on public.categories(collection_id);

-- RLS
alter table public.collections enable row level security;
alter table public.categories enable row level security;
alter table public.stickers enable row level security;
alter table public.album_pages enable row level security;
alter table public.page_stickers enable row level security;
alter table public.user_collections enable row level security;
alter table public.user_stickers enable row level security;
alter table public.scan_sessions enable row level security;

-- Public read for catalog
create policy "Collections are publicly readable"
  on public.collections for select using (true);

create policy "Categories are publicly readable"
  on public.categories for select using (true);

create policy "Stickers are publicly readable"
  on public.stickers for select using (true);

create policy "Album pages are publicly readable"
  on public.album_pages for select using (true);

create policy "Page stickers are publicly readable"
  on public.page_stickers for select using (true);

-- User collections
create policy "Users can view own collections"
  on public.user_collections for select using (auth.uid() = user_id);

create policy "Users can insert own collections"
  on public.user_collections for insert with check (auth.uid() = user_id);

create policy "Users can delete own collections"
  on public.user_collections for delete using (auth.uid() = user_id);

-- User stickers
create policy "Users can view own stickers"
  on public.user_stickers for select using (auth.uid() = user_id);

create policy "Users can insert own stickers"
  on public.user_stickers for insert with check (auth.uid() = user_id);

create policy "Users can update own stickers"
  on public.user_stickers for update using (auth.uid() = user_id);

create policy "Users can delete own stickers"
  on public.user_stickers for delete using (auth.uid() = user_id);

-- Scan sessions
create policy "Users can view own scans"
  on public.scan_sessions for select using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on public.scan_sessions for insert with check (auth.uid() = user_id);
