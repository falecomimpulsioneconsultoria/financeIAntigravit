-- =====================================================
-- MÓDULO: ALTERAÇÃO DE SENHA DE USUÁRIOS PELO SUPER ADMIN
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Garantir extensão pgcrypto para hash bcrypt compatível com Supabase Auth
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Função RPC segura para alteração de senha por Super Admin / Admin
CREATE OR REPLACE FUNCTION public.admin_update_user_password(
  p_target_user_id uuid,
  p_new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_caller_active boolean;
  v_target_role text;
  v_encrypted_pw text;
BEGIN
  -- Verificar autenticação do chamador
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  -- Validar permissão administrativa do chamador
  SELECT role, is_active
    INTO v_caller_role, v_caller_active
    FROM public.profiles
   WHERE id = v_caller_id;

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('SUPER_ADMIN', 'ADMIN') OR COALESCE(v_caller_active, false) = false THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores autorizados podem alterar senhas.';
  END IF;

  -- Validar parâmetros
  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário alvo inválido.';
  END IF;

  IF p_new_password IS NULL OR char_length(p_new_password) < 6 THEN
    RAISE EXCEPTION 'A nova senha deve ter no mínimo 6 caracteres.';
  END IF;

  -- Proteger contas SUPER_ADMIN contra alteração por ADMIN comum
  SELECT role
    INTO v_target_role
    FROM public.profiles
   WHERE id = p_target_user_id;

  IF v_target_role = 'SUPER_ADMIN' AND v_caller_role <> 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Apenas um Super Admin pode alterar a senha de outro Super Admin.';
  END IF;

  -- Gerar hash bcrypt compatível com GoTrue / Supabase Auth
  v_encrypted_pw := extensions.crypt(p_new_password, extensions.gen_salt('bf'));

  -- Atualizar senha em auth.users
  UPDATE auth.users
     SET encrypted_password = v_encrypted_pw,
         updated_at = now()
   WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado na base de autenticação.';
  END IF;
END;
$$;

-- 3. Permissões explícitas de execução
REVOKE ALL ON FUNCTION public.admin_update_user_password(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_password(uuid, text) TO service_role;
