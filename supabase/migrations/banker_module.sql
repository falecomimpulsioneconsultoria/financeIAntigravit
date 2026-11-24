-- =====================================================
-- MÓDULO BANQUEIRO (Referência Cliente <-> Banqueiro e Empréstimos)
-- SAFE MIGRATION: Sem alterações destrutivas nos dados existentes
-- =====================================================

-- -----------------------------------------------
-- 1. COLUNA banker_id EM CONTACTS (Banqueiro padrão do Cliente)
-- -----------------------------------------------
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS banker_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Impede que um contato seja banqueiro de si mesmo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_banker_not_self'
  ) THEN
    ALTER TABLE public.contacts
      ADD CONSTRAINT contacts_banker_not_self CHECK (banker_id IS NULL OR banker_id <> id);
  END IF;
END $$;

-- -----------------------------------------------
-- 2. COLUNAS banker_id E banker_name EM LOANS
-- -----------------------------------------------
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS banker_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS banker_name text;

-- -----------------------------------------------
-- 3. ÍNDICES PARA PERFORMANCE
-- -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_contacts_banker_id
  ON public.contacts(banker_id)
  WHERE banker_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loans_banker_id
  ON public.loans(banker_id)
  WHERE banker_id IS NOT NULL;

-- -----------------------------------------------
-- 4. RLS & PERMISSÕES / GRANTS (Supabase Data API)
-- -----------------------------------------------
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.contacts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.loans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;
