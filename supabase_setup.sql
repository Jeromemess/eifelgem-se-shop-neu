-- ============================================================
-- EIFELGEMÜSE – Supabase Datenbank Setup
-- Diesen Code einmal im Supabase SQL-Editor ausführen
-- ============================================================

-- 1. PRODUKTE-TABELLE
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price_per_unit numeric(10,2) not null default 0,
  unit        text not null default 'Stück',
  image_url   text default '',
  stock_quantity int not null default 0,
  is_active   boolean not null default true,
  description text default '',
  discount    int default 0,
  is_bogo     boolean default false,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

-- 2. BESTELLUNGEN-TABELLE
create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  customer_name text not null,
  items         jsonb not null default '[]',
  total_amount  numeric(10,2) not null default 0,
  week_label    text not null,
  created_at    timestamptz default now()
);

-- 3. EINSTELLUNGEN-TABELLE (immer nur 1 Zeile mit id=1)
create table if not exists settings (
  id                  int primary key default 1,
  pickup_day          text default 'Donnerstag',
  pickup_time         text default '17:00',
  open_day            text default 'Sonntag',
  max_slots           int default 50,
  current_pickup_date text default '',
  is_shop_open        boolean default true,
  next_opening_text   text default 'Montag Abend'
);

-- Erste Einstellungs-Zeile einfügen (falls noch nicht vorhanden)
insert into settings (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- ZUGRIFF (Row Level Security)
-- Die App nutzt den anon-Key, daher voller Zugriff erlauben
-- ============================================================

alter table products enable row level security;
alter table orders   enable row level security;
alter table settings enable row level security;

-- Produkte: jeder darf lesen, anon darf schreiben (Admin-Bereich)
create policy "Produkte lesen"   on products for select using (true);
create policy "Produkte schreiben" on products for all using (true);

-- Bestellungen: jeder darf lesen und schreiben
create policy "Bestellungen lesen"    on orders for select using (true);
create policy "Bestellungen schreiben" on orders for all using (true);

-- Einstellungen: jeder darf lesen und schreiben
create policy "Einstellungen lesen"    on settings for select using (true);
create policy "Einstellungen schreiben" on settings for all using (true);
