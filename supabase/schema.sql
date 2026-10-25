-- Aavaran Living — database schema
-- Run in Supabase: SQL Editor → New query → paste → Run.

create extension if not exists "pgcrypto";

-- ───────────── Products ─────────────
create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  description   text,
  -- Prices in the smallest unit (cents). Set both; the store shows the shopper's choice.
  price_usd     integer not null check (price_usd >= 0),
  price_eur     integer not null check (price_eur >= 0),
  size          text,          -- e.g. "5' x 8' (152 x 244 cm)"
  material      text,          -- e.g. "Hand-knotted New Zealand wool"
  weave         text,          -- e.g. "Hand-knotted", "Hand-tufted", "Flatweave"
  images        text[] not null default '{}',
  stock         integer not null default 0 check (stock >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ───────────── Orders ─────────────
create table if not exists orders (
  id                  uuid primary key default gen_random_uuid(),
  stripe_session_id   text unique not null,
  email               text,
  customer_name       text,
  currency            text not null,
  amount_total        integer not null,
  shipping_address    jsonb,
  status              text not null default 'paid',  -- paid | shipped | delivered | refunded
  created_at          timestamptz not null default now()
);

create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  name        text not null,
  unit_amount integer not null,
  quantity    integer not null check (quantity > 0)
);

-- ───────────── Security (Row Level Security) ─────────────
-- Shoppers (anon key) can only READ active products.
-- Orders are written only by the server webhook using the service-role key, which bypasses RLS.
alter table products    enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;

drop policy if exists "Public can read active products" on products;
create policy "Public can read active products"
  on products for select
  using (is_active = true);

-- Decrement stock atomically after payment (called by the webhook).
create or replace function decrement_stock(p_id uuid, qty integer)
returns void language sql security definer as $$
  update products set stock = greatest(stock - qty, 0) where id = p_id;
$$;
revoke execute on function decrement_stock(uuid, integer) from public, anon, authenticated;

-- ───────────── Sample products (delete once real ones are added) ─────────────
insert into products (slug, name, description, price_usd, price_eur, size, material, weave, images, stock)
values
  ('sahara-handknotted-wool', 'Sahara Hand-Knotted Wool Rug',
   'Warm sand tones with a softly distressed field. Hand-knotted by artisans in Bhadohi, India.',
   89900, 82900, '5'' x 8'' (152 x 244 cm)', '100% New Zealand wool', 'Hand-knotted',
   '{}', 6),
  ('indigo-flatweave-kilim', 'Indigo Flatweave Kilim',
   'Reversible, low-profile kilim in deep indigo. Ideal for dining rooms and high-traffic areas.',
   34900, 32500, '4'' x 6'' (122 x 183 cm)', 'Wool and cotton', 'Flatweave',
   '{}', 10),
  ('ivory-tufted-modern', 'Ivory Modern Tufted Rug',
   'Plush, quiet texture in ivory with a subtle tonal geometric pattern.',
   54900, 50900, '6'' x 9'' (183 x 274 cm)', 'Wool blend', 'Hand-tufted',
   '{}', 8)
on conflict (slug) do nothing;
