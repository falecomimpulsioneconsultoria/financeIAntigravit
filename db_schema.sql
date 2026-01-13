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

-- RLS POLICIES
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.transactions enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can view own accounts" on public.accounts for select using (auth.uid() = user_id);
create policy "Users can insert own accounts" on public.accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own accounts" on public.accounts for update using (auth.uid() = user_id);
create policy "Users can delete own accounts" on public.accounts for delete using (auth.uid() = user_id);

create policy "Users can view own categories" on public.categories for select using (auth.uid() = user_id);
create policy "Users can insert own categories" on public.categories for insert with check (auth.uid() = user_id);
create policy "Users can update own categories" on public.categories for update using (auth.uid() = user_id);
create policy "Users can delete own categories" on public.categories for delete using (auth.uid() = user_id);

create policy "Users can view own payment methods" on public.payment_methods for select using (auth.uid() = user_id);
create policy "Users can insert own payment methods" on public.payment_methods for insert with check (auth.uid() = user_id);
create policy "Users can update own payment methods" on public.payment_methods for update using (auth.uid() = user_id);
create policy "Users can delete own payment methods" on public.payment_methods for delete using (auth.uid() = user_id);

create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

-- TRIGGER for new users
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'name', 'USER');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
