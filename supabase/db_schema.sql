
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  email text,
  role text default 'USER',
  is_active boolean default true,
  created_at timestamptz default now(),
  expiration_date timestamptz,
  subscription_price numeric,
  account_type text default 'PERSONAL',
  document text,
  sub_users jsonb default '[]'::jsonb
);

-- ACCOUNTS
create table public.accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  balance numeric default 0,
  color text,
  type text default 'CHECKING',
  created_at timestamptz default now()
);

-- CATEGORIES
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null,
  color text,
  parent_id uuid references public.categories(id) on delete cascade,
  dre_category text,
  budget_limit numeric default 0,
  created_at timestamptz default now()
);

-- PAYMENT METHODS
create table public.payment_methods (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- TRANSACTIONS
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  description text not null,
  amount numeric not null,
  date date not null,
  payment_date date,
  type text not null,
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete cascade,
  to_account_id uuid references public.accounts(id) on delete set null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  status text default 'PENDING',
  observation text,
  is_recurring boolean default false,
  recurring_type text,
  installment_current integer,
  installment_total integer,
  parent_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz default now()
);

-- INVESTMENT ASSETS (NEW Module)
create table public.investment_assets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  ticker text,
  name text not null,
  type text not null, -- 'STOCK', 'REIT', 'FIXED_INCOME', 'CRYPTO', 'OTHER'
  current_price numeric default 0,
  quantity numeric default 0, 
  average_price numeric default 0,
  created_at timestamptz default now()
);

-- INVESTMENT TRANSACTIONS (NEW Module)
create table public.investment_transactions (
  id uuid default uuid_generate_v4() primary key,
  asset_id uuid references public.investment_assets(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null, -- 'BUY', 'SELL'
  quantity numeric not null,
  price numeric not null,
  total_amount numeric not null,
  date date not null,
  fees numeric default 0,
  created_at timestamptz default now()
);

-- RLS POLICIES
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.transactions enable row level security;
alter table public.investment_assets enable row level security;
alter table public.investment_transactions enable row level security;

-- ... (Existing policies would be here, assumed handled by migrations or separate setup)
