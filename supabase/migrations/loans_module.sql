-- =====================================================
-- MÓDULO DE CONTROLE DE EMPRÉSTIMOS
-- Juros a cada 30 dias, renovação, atraso diário e amortização
-- SAFE MIGRATION: Sem alterações destrutivas nos dados existentes
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------
-- TABELA LOANS (Contratos de Empréstimo)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.loans (
  id                     uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id                uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  contact_id             uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  account_id             uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  borrower_name          text NOT NULL,
  original_principal     numeric(14, 2) NOT NULL CHECK (original_principal > 0),
  current_principal      numeric(14, 2) NOT NULL CHECK (current_principal >= 0),
  cycle_principal        numeric(14, 2) NOT NULL CHECK (cycle_principal >= 0),
  interest_rate          numeric(8, 4) NOT NULL CHECK (interest_rate >= 0),
  late_fee_type          text NOT NULL DEFAULT 'PERCENTAGE' CHECK (late_fee_type IN ('FIXED', 'PERCENTAGE')),
  late_fee_value         numeric(14, 4) NOT NULL DEFAULT 0 CHECK (late_fee_value >= 0),
  start_date             date NOT NULL,
  due_date               date NOT NULL,
  renewals_count         integer NOT NULL DEFAULT 0 CHECK (renewals_count >= 0),
  status                 text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAID_OFF')),
  paid_off_at            date,
  notes                  text,
  created_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

-- -----------------------------------------------
-- TABELA LOAN_PAYMENTS (Histórico de Pagamentos, Renovações e Amortizações)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.loan_payments (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  loan_id             uuid REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  user_id             uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  payment_type        text NOT NULL CHECK (
    payment_type IN (
      'INTEREST_ONLY',
      'INTEREST_AND_AMORTIZATION',
      'EARLY_AMORTIZATION',
      'FULL_SETTLEMENT'
    )
  ),
  payment_date        date NOT NULL,
  total_paid          numeric(14, 2) NOT NULL CHECK (total_paid > 0),
  late_fee_paid       numeric(14, 2) NOT NULL DEFAULT 0 CHECK (late_fee_paid >= 0),
  interest_paid       numeric(14, 2) NOT NULL DEFAULT 0 CHECK (interest_paid >= 0),
  principal_amortized numeric(14, 2) NOT NULL DEFAULT 0 CHECK (principal_amortized >= 0),
  days_overdue        integer NOT NULL DEFAULT 0 CHECK (days_overdue >= 0),
  principal_before    numeric(14, 2) NOT NULL,
  principal_after     numeric(14, 2) NOT NULL,
  previous_due_date   date NOT NULL,
  new_due_date        date NOT NULL,
  account_id          uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  transaction_id      uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  notes               text,
  created_at          timestamptz DEFAULT now()
);

-- -----------------------------------------------
-- RLS - Row Level Security para public.loans
-- -----------------------------------------------
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loans_select_policy" ON public.loans;
CREATE POLICY "loans_select_policy"
  ON public.loans FOR SELECT
  USING (
    (auth.uid() = user_id)
    OR (user_id = (SELECT profiles.owner_id FROM public.profiles WHERE profiles.id = auth.uid()))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "loans_insert_policy" ON public.loans;
CREATE POLICY "loans_insert_policy"
  ON public.loans FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id)
    OR (user_id = (SELECT profiles.owner_id FROM public.profiles WHERE profiles.id = auth.uid()))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "loans_update_policy" ON public.loans;
CREATE POLICY "loans_update_policy"
  ON public.loans FOR UPDATE
  USING (
    (auth.uid() = user_id)
    OR (user_id = (SELECT profiles.owner_id FROM public.profiles WHERE profiles.id = auth.uid()))
    OR public.is_admin()
  )
  WITH CHECK (
    (auth.uid() = user_id)
    OR (user_id = (SELECT profiles.owner_id FROM public.profiles WHERE profiles.id = auth.uid()))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "loans_delete_policy" ON public.loans;
CREATE POLICY "loans_delete_policy"
  ON public.loans FOR DELETE
  USING (
    (auth.uid() = user_id)
    OR (user_id = (SELECT profiles.owner_id FROM public.profiles WHERE profiles.id = auth.uid()))
    OR public.is_admin()
  );

-- -----------------------------------------------
-- RLS - Row Level Security para public.loan_payments
-- -----------------------------------------------
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loan_payments_select_policy" ON public.loan_payments;
CREATE POLICY "loan_payments_select_policy"
  ON public.loan_payments FOR SELECT
  USING (
    (auth.uid() = user_id)
    OR (user_id = (SELECT profiles.owner_id FROM public.profiles WHERE profiles.id = auth.uid()))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "loan_payments_insert_policy" ON public.loan_payments;
CREATE POLICY "loan_payments_insert_policy"
  ON public.loan_payments FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id)
    OR (user_id = (SELECT profiles.owner_id FROM public.profiles WHERE profiles.id = auth.uid()))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "loan_payments_update_policy" ON public.loan_payments;
CREATE POLICY "loan_payments_update_policy"
  ON public.loan_payments FOR UPDATE
  USING (
    (auth.uid() = user_id)
    OR (user_id = (SELECT profiles.owner_id FROM public.profiles WHERE profiles.id = auth.uid()))
    OR public.is_admin()
  )
  WITH CHECK (
    (auth.uid() = user_id)
    OR (user_id = (SELECT profiles.owner_id FROM public.profiles WHERE profiles.id = auth.uid()))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "loan_payments_delete_policy" ON public.loan_payments;
CREATE POLICY "loan_payments_delete_policy"
  ON public.loan_payments FOR DELETE
  USING (
    (auth.uid() = user_id)
    OR (user_id = (SELECT profiles.owner_id FROM public.profiles WHERE profiles.id = auth.uid()))
    OR public.is_admin()
  );

-- -----------------------------------------------
-- PERMISSÕES / GRANTS (Supabase Data API)
-- -----------------------------------------------
GRANT SELECT ON public.loans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;

GRANT SELECT ON public.loan_payments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_payments TO authenticated;
GRANT ALL ON public.loan_payments TO service_role;

-- -----------------------------------------------
-- ÍNDICES para performance
-- -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_contact_id ON public.loans(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loans_status_due_date ON public.loans(user_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_user_id ON public.loan_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_date ON public.loan_payments(loan_id, payment_date);
