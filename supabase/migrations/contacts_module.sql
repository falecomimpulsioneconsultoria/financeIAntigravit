-- =====================================================
-- MÓDULO DE CONTATOS / PESSOAS / FORNECEDORES
-- SAFE MIGRATION: Sem alterações destrutivas nos dados
-- =====================================================

-- Enable UUID extension (safe if already exists)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------
-- TABELA CONTACTS
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.contacts (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  fantasy_name  text NOT NULL,
  legal_name    text,
  person_type   text DEFAULT 'FISICA' CHECK (person_type IN ('FISICA', 'JURIDICA')),
  cpf_cnpj      text,
  email         text,
  phone         text,
  whatsapp      text,
  mobile        text,
  labels        text[] DEFAULT '{}',
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- -----------------------------------------------
-- COLUNA contact_id EM TRANSACTIONS (NULLABLE)
-- Dados existentes NÃO são afetados (ON DELETE SET NULL)
-- -----------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

-- -----------------------------------------------
-- RLS - Row Level Security para contacts
-- -----------------------------------------------
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Policy: usuário vê apenas seus próprios contatos
DROP POLICY IF EXISTS "contacts_select_own" ON public.contacts;
CREATE POLICY "contacts_select_own"
  ON public.contacts FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: usuário insere apenas para si mesmo
DROP POLICY IF EXISTS "contacts_insert_own" ON public.contacts;
CREATE POLICY "contacts_insert_own"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: usuário atualiza apenas seus contatos
DROP POLICY IF EXISTS "contacts_update_own" ON public.contacts;
CREATE POLICY "contacts_update_own"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: usuário exclui apenas seus contatos
DROP POLICY IF EXISTS "contacts_delete_own" ON public.contacts;
CREATE POLICY "contacts_delete_own"
  ON public.contacts FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------
-- ÍNDICES para performance de busca
-- -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_cpf_cnpj ON public.contacts(user_id, cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(user_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_contact_id ON public.transactions(contact_id) WHERE contact_id IS NOT NULL;
