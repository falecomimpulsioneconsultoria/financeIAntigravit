-- =====================================================
-- CORREÇÃO PARA ERRO DE DUPLICIDADE (profiles_pkey)
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Primeiro, deletamos a função anterior para evitar conflito de tipos de retorno
DROP FUNCTION IF EXISTS public.create_team_member(text, text, text, uuid, jsonb);

-- Em seguida, recriamos a função usando UPDATE em vez de INSERT
CREATE OR REPLACE FUNCTION public.create_team_member(
  p_email text,
  p_password text,
  p_full_name text,
  p_owner_uuid uuid,
  p_perms jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
BEGIN
  -- 1. Gera ID e senha encriptada para o novo usuário
  v_user_id := gen_random_uuid();
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- 2. Insere na tabela auth.users. 
  -- ISSO DISPARA O TRIGGER AUTOMÁTICO QUE CRIA A LINHA EM public.profiles!
  INSERT INTO auth.users (
    id, 
    instance_id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    raw_user_meta_data, 
    created_at, 
    updated_at, 
    role, 
    aud
  )
  VALUES (
    v_user_id, 
    '00000000-0000-0000-0000-000000000000', 
    p_email, 
    v_encrypted_pw, 
    now(), 
    jsonb_build_object('name', p_full_name),
    now(), 
    now(), 
    'authenticated', 
    'authenticated'
  )
  RETURNING id INTO v_user_id;

  -- 3. Atualiza (UPDATE) os dados na tabela profiles (em vez de usar INSERT)
  UPDATE public.profiles
  SET 
    name = p_full_name,
    owner_id = p_owner_uuid,
    permissions = p_perms,
    role = 'VIEWER', -- Role padrão para membro da equipe
    is_active = true
  WHERE id = v_user_id;

END;
$$;
