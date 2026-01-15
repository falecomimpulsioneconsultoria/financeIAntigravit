
-- Tabela de Ativos de Investimento
CREATE TABLE public.investment_assets (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ticker text,
  name text NOT NULL,
  type text NOT NULL, -- 'STOCK', 'REIT', 'FIXED_INCOME', 'CRYPTO', 'OTHER'
  current_price numeric DEFAULT 0,
  quantity numeric DEFAULT 0, -- Quantidade atual consolidada
  average_price numeric DEFAULT 0, -- Preço médio consolidado
  created_at timestamptz DEFAULT now()
);

-- Tabela de Transações de Investimento (Histórico)
CREATE TABLE public.investment_transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  asset_id uuid REFERENCES public.investment_assets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL, -- 'BUY', 'SELL'
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  total_amount numeric NOT NULL,
  date date NOT NULL,
  fees numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.investment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets" ON public.investment_assets FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can insert own assets" ON public.investment_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assets" ON public.investment_assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own assets" ON public.investment_assets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own investment transactions" ON public.investment_transactions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can insert own investment transactions" ON public.investment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own investment transactions" ON public.investment_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own investment transactions" ON public.investment_transactions FOR DELETE USING (auth.uid() = user_id);
