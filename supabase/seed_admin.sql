-- =====================================================
-- SCRIPT DE CRIAÇÃO DO USUÁRIO ADMIN
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- IMPORTANTE: Primeiro, crie o usuário via Dashboard:
-- 1. Acesse Supabase Dashboard > Authentication > Users > Add User
-- 2. Email: admin@finances.ai
-- 3. Password: Admin@123 (ou a senha que preferir)
-- 4. Depois execute o SQL abaixo:

-- Atualizar o perfil para ADMIN com licença permanente
UPDATE public.profiles 
SET 
  role = 'ADMIN',
  name = 'Administrador',
  is_active = true,
  account_type = 'BUSINESS',
  subscription_price = 0,
  expiration_date = '2099-12-31T23:59:59Z'
WHERE email = 'admin@finances.ai';

-- Verificar se foi atualizado corretamente
SELECT id, email, name, role, is_active, expiration_date 
FROM public.profiles 
WHERE email = 'admin@finances.ai';

-- =====================================================
-- ALTERNATIVA: Criar usuário via SQL (se tiver acesso)
-- Nota: Isso requer service_role key, não funciona com anon key
-- =====================================================

-- Se você tiver acesso à função auth.admin_create_user, use:
-- SELECT auth.admin_create_user(
--   '{"email": "admin@finances.ai", "password": "Admin@123", "email_confirm": true}'::jsonb
-- );

-- =====================================================
-- CREDENCIAIS PADRÃO
-- =====================================================
-- Email: admin@finances.ai
-- Senha: Admin@123 (ou a que você definir no Dashboard)
-- =====================================================
