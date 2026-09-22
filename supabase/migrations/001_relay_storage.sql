-- Run once in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  client_item_id text not null unique,
  name text not null check (char_length(name) between 1 and 80),
  category text not null,
  condition text not null default '见物品描述',
  description text not null,
  asking_price numeric(10,2) not null check (asking_price >= 0),
  school text not null,
  gate text not null check (gate in ('teaching', 'living')),
  owner_label text not null default '我',
  owner_statement text not null default '',
  status text not null default 'review' check (status in ('review','revision','published','sold','withdrawn')),
  source_type text not null default 'owner_statement' check (source_type in ('owner_statement','uploaded_record','platform_transaction','unknown')),
  confirmed_by_owner boolean not null default false,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  image_type text not null check (image_type in ('primary','side','defect','proof')),
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique (item_id, image_type)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  final_price numeric(10,2) not null check (final_price >= 0),
  buyer_confirmed boolean not null default false,
  seller_confirmed boolean not null default false,
  source_type text not null default 'platform_transaction' check (source_type = 'platform_transaction'),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (buyer_confirmed and seller_confirmed)
);

create table if not exists public.price_records (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete set null,
  comparable_name text not null,
  category text not null,
  condition text not null default '未知',
  price numeric(10,2) not null check (price >= 0),
  source_type text not null check (source_type in ('platform_transaction','uploaded_record','public_asking_price','owner_statement')),
  source_label text not null,
  source_url text,
  confirmed boolean not null default false,
  occurred_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists items_category_status_idx on public.items(category, status);
create index if not exists price_records_lookup_idx on public.price_records(category, source_type, confirmed);

alter table public.items enable row level security;
alter table public.item_images enable row level security;
alter table public.transactions enable row level security;
alter table public.price_records enable row level security;

-- The browser has no direct table policies. The Render backend uses the service
-- role and is the only writer/reader in this first version.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', false, 8388608, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg'];
