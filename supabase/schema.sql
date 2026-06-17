create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price integer not null check (price >= 0),
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  status text not null default 'pending',
  total_amount integer not null check (total_amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total integer not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists products_active_created_at_idx
  on public.products (is_active, created_at);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant insert on public.order_items to anon, authenticated;
grant usage, select on sequence public.order_items_id_seq to anon, authenticated;

drop policy if exists "products are publicly readable" on public.products;
create policy "products are publicly readable"
  on public.products
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "anyone can create orders" on public.orders;
create policy "anyone can create orders"
  on public.orders
  for insert
  to anon, authenticated
  with check (
    length(trim(customer_name)) > 0
    and customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and length(trim(customer_phone)) > 0
    and total_amount >= 0
  );

drop policy if exists "anyone can create order items" on public.order_items;
create policy "anyone can create order items"
  on public.order_items
  for insert
  to anon, authenticated
  with check (
    quantity > 0
    and unit_price >= 0
    and line_total = unit_price * quantity
  );

insert into public.products (name, category, price, description)
values
  ('阿里山金萱', '高山烏龍', 680, '奶香清雅、茶湯柔順，適合日常熱泡。'),
  ('杉林溪烏龍', '高山烏龍', 820, '花香細緻、喉韻清爽，是本季主打茶款。'),
  ('紅玉紅茶', '台灣紅茶', 520, '帶有薄荷與肉桂般香氣，冷熱飲都很合適。'),
  ('東方美人', '蜜香烏龍', 960, '熟果蜜香明顯，茶湯圓潤有層次。'),
  ('炭焙鐵觀音', '焙火茶', 760, '焙火香沉穩，尾韻帶堅果與焦糖感。'),
  ('冷泡四季春', '冷泡茶', 360, '清爽花香、低苦澀，適合夏日冷藏浸泡。')
on conflict do nothing;
