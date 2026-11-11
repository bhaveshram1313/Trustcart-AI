-- TrustCart AI — Supabase Database Schema & Row Level Security (RLS)
-- Run this SQL in your Supabase SQL Editor when connecting live Supabase Auth & Postgres.

-- 1. User Profiles (stores account_type = 'buyer' | 'seller')
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  account_type text not null check (account_type in ('buyer', 'seller')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update own non-role profile fields"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and account_type = (select p.account_type from public.profiles p where p.id = auth.uid())
  );

-- Helper function to check seller role cleanly in RLS policies
create or replace function public.is_seller(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and account_type = 'seller'
  );
$$;

-- 2. Seller Profiles (business details linked 1:1 to seller user)
create table if not exists public.seller_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  shop_name text not null default '',
  phone text not null default '',
  business_address text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.seller_profiles enable row level security;

create policy "Anyone can view seller storefront info"
  on public.seller_profiles
  for select
  using (true);

create policy "Sellers can insert own seller profile"
  on public.seller_profiles
  for insert
  with check (auth.uid() = user_id and public.is_seller(auth.uid()));

create policy "Sellers can update own seller profile"
  on public.seller_profiles
  for update
  using (auth.uid() = user_id and public.is_seller(auth.uid()))
  with check (auth.uid() = user_id and public.is_seller(auth.uid()));

-- 3. Products (strictly owned by authenticated seller_id = auth.uid())
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  description text not null,
  price numeric(10, 2) not null check (price > 0),
  image_url text not null default '',
  specs jsonb not null default '{}'::jsonb,
  stock integer not null default 0 check (stock >= 0),
  trust_score integer not null default 88 check (trust_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Anyone can view published products"
  on public.products
  for select
  using (true);

create policy "Only authenticated sellers can create products under their own user id"
  on public.products
  for insert
  with check (
    auth.uid() = seller_id
    and public.is_seller(auth.uid())
  );

create policy "Sellers can only update their own products"
  on public.products
  for update
  using (
    auth.uid() = seller_id
    and public.is_seller(auth.uid())
  )
  with check (
    auth.uid() = seller_id
    and public.is_seller(auth.uid())
  );

create policy "Sellers can only delete their own products"
  on public.products
  for delete
  using (
    auth.uid() = seller_id
    and public.is_seller(auth.uid())
  );

-- 4. Orders (strictly isolated per authenticated buyer user_id)
create table if not exists public.orders (
  id text primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  status text not null default 'Processing',
  payment_method text not null,
  paypal_transaction_id text not null,
  buyer_protection_status text not null,
  trust_score_at_purchase integer not null,
  subtotal numeric(10, 2) not null,
  shipping numeric(10, 2) not null,
  tax numeric(10, 2) not null,
  total numeric(10, 2) not null,
  shipping_address text not null,
  items jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Users can view only their own orders"
  on public.orders
  for select
  using (auth.uid() = user_id);

create policy "Users can create orders only for themselves"
  on public.orders
  for insert
  with check (auth.uid() = user_id);

-- 5. Automatic profile provisioning trigger on Supabase Auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acct_type text;
begin
  acct_type := coalesce(new.raw_user_meta_data->>'account_type', 'buyer');
  if acct_type not in ('buyer', 'seller') then
    acct_type := 'buyer';
  end if;

  insert into public.profiles (id, full_name, email, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    acct_type
  )
  on conflict (id) do nothing;

  if acct_type = 'seller' then
    insert into public.seller_profiles (user_id, shop_name, phone, business_address)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'shop_name', ''),
      coalesce(new.raw_user_meta_data->>'phone', ''),
      coalesce(new.raw_user_meta_data->>'business_address', '')
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
