
-- HOTFIX: CORREÇÃO DE RECURSÃO INFINITA NO RLS (Erro de Login)
-- Execute este script no SQL Editor do Supabase para corrigir o problema de login do Admin.

-- 1. Criar função auxiliar com 'security definer' para quebrar a recursão
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role = 'ADMIN'
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Limpar políticas antigas problemáticas que causam recursão
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admins can view all categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can view all payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;

-- 3. Recriar as políticas usando a nova função segura
-- PROFILES
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING (public.is_admin());

-- ACCOUNTS
CREATE POLICY "Admins can view all accounts" ON public.accounts
FOR SELECT USING (public.is_admin());

-- CATEGORIES
CREATE POLICY "Admins can view all categories" ON public.categories
FOR SELECT USING (public.is_admin());

-- PAYMENT METHODS
CREATE POLICY "Admins can view all payment methods" ON public.payment_methods
FOR SELECT USING (public.is_admin());

-- TRANSACTIONS
CREATE POLICY "Admins can view all transactions" ON public.transactions
FOR SELECT USING (public.is_admin());

-- 4. Garantir que a política padrão "Users can view own profile" ainda existe
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles 
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE USING (auth.uid() = id);
