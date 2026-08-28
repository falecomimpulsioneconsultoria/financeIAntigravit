-- =====================================================
-- CORREÇÃO DE RLS PARA EXIBIÇÃO DE MEMBROS DA EQUIPE
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Permite que o dono (owner) veja os perfis da sua equipe
DROP POLICY IF EXISTS "Owners can view their team members" ON public.profiles;
CREATE POLICY "Owners can view their team members" 
ON public.profiles FOR SELECT 
USING (owner_id = auth.uid());

-- 2. Permite que o dono (owner) atualize os perfis da sua equipe
DROP POLICY IF EXISTS "Owners can update their team members" ON public.profiles;
CREATE POLICY "Owners can update their team members" 
ON public.profiles FOR UPDATE 
USING (owner_id = auth.uid());

-- (A deleção normalmente é feita via função delete_team_member com SECURITY DEFINER, 
-- mas caso precise, essa policy cobre deleções diretas)
DROP POLICY IF EXISTS "Owners can delete their team members" ON public.profiles;
CREATE POLICY "Owners can delete their team members" 
ON public.profiles FOR DELETE 
USING (owner_id = auth.uid());
