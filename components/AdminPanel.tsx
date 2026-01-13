
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { Button } from './ui/Button';

// O código SQL para exibição e configuração no Supabase
const SUPABASE_SCHEMA_SQL = `-- 1. Habilitar extensão de UUID (necessário para gerar IDs únicos)
create extension if not exists "uuid-ossp";

-- 2. Tabela de Perfis (Vinculada aos usuários do Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  name text,
  role text default 'USER', -- 'ADMIN' ou 'USER'
  is_active boolean default true,
  account_type text default 'PERSONAL', -- 'PERSONAL' ou 'BUSINESS'
  document text, -- CPF ou CNPJ
  sub_users jsonb default '[]'::jsonb, -- Para controle de equipe/família
  subscription_price numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expiration_date timestamp with time zone
);

-- 3. Tabela de Contas (Bancos, Carteira)
create table public.accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  balance numeric default 0,
  color text default 'blue',
  type text default 'CHECKING', -- 'CHECKING', 'INVESTMENT', 'CASH'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Tabela de Categorias (Hierárquicas e Mapeadas para DRE)
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null, -- 'INCOME' ou 'EXPENSE'
  color text default 'gray',
  parent_id uuid references public.categories(id) on delete set null, -- Subcategorias
  dre_category text, -- Mapeamento para relatórios contábeis
  budget_limit numeric -- Meta de receita ou Limite de gasto mensal
);

-- 5. Tabela de Formas de Pagamento
create table public.payment_methods (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Tabela de Transações (Lançamentos)
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  description text not null,
  amount numeric not null,
  date date not null, -- Data de Competência / Vencimento
  payment_date date, -- Data de Caixa / Pagamento Real
  type text not null, -- 'INCOME', 'EXPENSE', 'TRANSFER'
  status text not null, -- 'PAID', 'PENDING'
  category_id text, -- ID da categoria (texto para flexibilidade em transferências)
  account_id uuid references public.accounts(id) on delete cascade, -- Conta Origem
  to_account_id uuid references public.accounts(id) on delete set null, -- Conta Destino (se transf)
  payment_method_id uuid references public.payment_methods(id) on delete set null, -- Forma de Pagamento
  observation text,
  is_recurring boolean default false,
  recurring_type text, -- 'FIXED' ou 'INSTALLMENT'
  installment_current integer,
  installment_total integer,
  parent_id uuid references public.transactions(id) on delete set null, -- Hierarquia de transações (ex: saldo restante)
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. Configuração de Segurança (RLS - Row Level Security)
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.transactions enable row level security;

-- Políticas de Acesso
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can crud own accounts" on public.accounts for all using (auth.uid() = user_id);
create policy "Users can crud own categories" on public.categories for all using (auth.uid() = user_id);
create policy "Users can crud own payment_methods" on public.payment_methods for all using (auth.uid() = user_id);
create policy "Users can crud own transactions" on public.transactions for all using (auth.uid() = user_id);

-- 8. Trigger Automático para Novos Usuários (Dados Padrão)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  -- Cria Perfil
  insert into public.profiles (id, email, name, expiration_date)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'name', new.email), 
    (now() + interval '30 days')
  );

  -- Cria Formas de Pagamento Padrão
  insert into public.payment_methods (user_id, name) values
  (new.id, 'Pix'),
  (new.id, 'Dinheiro'),
  (new.id, 'Cartão de Crédito'),
  (new.id, 'Cartão de Débito'),
  (new.id, 'Boleto');

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();`;

type AdminTab = 'USERS' | 'DATABASE';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('USERS');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputPrices, setInputPrices] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

  const loadUsers = async () => {
    let allUsers = await authService.getUsers();
    const now = new Date();
    const updatesPromises: Promise<void>[] = [];
    let stateChanged = false;

    // AUTO-BLOCK LOGIC
    allUsers.forEach(user => {
      if (user.role !== 'ADMIN' && user.isActive) {
        const expirationDate = new Date(user.expirationDate);
        if (now > expirationDate) {
          updatesPromises.push(authService.updateUser(user.id, { isActive: false }));
          user.isActive = false;
          stateChanged = true;
        }
      }
    });

    if (stateChanged && updatesPromises.length > 0) {
      await Promise.all(updatesPromises);
      allUsers = await authService.getUsers();
    }

    allUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setUsers(allUsers);
    
    if (Object.keys(inputPrices).length === 0) {
      const prices: Record<string, number> = {};
      allUsers.forEach(u => {
        prices[u.id] = u.subscriptionPrice || 29.90;
      });
      setInputPrices(prices);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleActive = async (user: User) => {
    setIsLoading(true);
    if (!user.isActive) {
        const now = new Date();
        const expDate = new Date(user.expirationDate);
        if (now > expDate) {
            const confirmed = window.confirm(
                `A licença deste usuário venceu em ${expDate.toLocaleDateString('pt-BR')}. \n\nDeseja liberar o acesso MANUALMENTE mesmo assim?`
            );
            if (!confirmed) {
                setIsLoading(false);
                return;
            }
        }
    }
    await authService.updateUser(user.id, { isActive: !user.isActive });
    await loadUsers();
    setIsLoading(false);
  };

  const handleDateChange = async (user: User, newDate: string) => {
    const dateObj = new Date(newDate);
    dateObj.setHours(23, 59, 59, 999);
    await authService.updateUser(user.id, { expirationDate: dateObj.toISOString() });
    loadUsers();
  };

  const handlePriceChange = (userId: string, val: string) => {
    setInputPrices(prev => ({ ...prev, [userId]: parseFloat(val) }));
  };

  const handleRenewSubscription = async (user: User) => {
    const amount = inputPrices[user.id] || 29.90;
    if (window.confirm(`Confirmar pagamento de R$ ${amount.toFixed(2)} para ${user.name}?`)) {
      setIsLoading(true);
      await authService.renewSubscription(user.id, amount);
      loadUsers();
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = useMemo(() => {
    const clientUsers = users.filter(u => u.role !== 'ADMIN');
    const totalRevenue = clientUsers.reduce((acc, u) => acc + (u.subscriptionPrice || 0), 0);
    const activeCount = clientUsers.filter(u => u.isActive).length;
    const now = new Date();
    const overdueCount = clientUsers.filter(u => new Date(u.expirationDate) < now).length;

    return { totalUsers: clientUsers.length, activeCount, overdueCount, totalRevenue };
  }, [users]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-xl font-bold text-gray-900">Painel Super Admin</h2>
           <p className="text-gray-500 text-sm">Controle total do sistema.</p>
        </div>

        {/* Internal Menu (Tabs) */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
           <button 
             onClick={() => setActiveTab('USERS')}
             className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'USERS' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
           >
             Usuários
           </button>
           <button 
             onClick={() => setActiveTab('DATABASE')}
             className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'DATABASE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
           >
             Sistema / SQL
           </button>
        </div>
      </div>

      {/* --- TAB: USERS --- */}
      {activeTab === 'USERS' && (
        <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Receita Mensal</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Clientes</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalUsers}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Ativos</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.activeCount}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Em Atraso</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.overdueCount}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up delay-100">
                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                    <tr>
                        <th className="px-6 py-4">Usuário</th>
                        <th className="px-6 py-4 text-center">Situação</th>
                        <th className="px-6 py-4 text-center">Acesso</th>
                        <th className="px-6 py-4">Vencimento</th>
                        <th className="px-6 py-4">Ações</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {users.map((user) => {
                        const now = new Date();
                        const expirationDate = new Date(user.expirationDate);
                        const isExpired = now > expirationDate;
                        const isSelf = user.email === 'admin@finances.ai';

                        // Badge Logic
                        let badge;
                        if (user.role === 'ADMIN') badge = <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">Isento</span>;
                        else if (isExpired) badge = <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800 animate-pulse">Atrasado</span>;
                        else badge = <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Em Dia</span>;

                        // Button Style
                        const btnClass = user.isActive 
                            ? "bg-white text-green-700 border-green-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                            : "bg-red-50 text-red-700 border-red-200 hover:bg-green-50 hover:text-green-600";

                        return (
                        <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${isExpired && !isSelf ? 'bg-red-50/20' : ''}`}>
                            <td className="px-6 py-4">
                            <div>
                                <p className="font-semibold text-gray-900">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                            </td>
                            <td className="px-6 py-4 text-center">{badge}</td>
                            <td className="px-6 py-4 text-center">
                            {isSelf ? <span className="font-bold text-xs">Admin</span> : (
                                <button 
                                    onClick={() => handleToggleActive(user)}
                                    disabled={isLoading}
                                    className={`w-full px-3 py-1 rounded-md text-xs font-semibold border transition-all ${btnClass}`}
                                >
                                    {user.isActive ? 'Liberado' : 'Bloqueado'}
                                </button>
                            )}
                            </td>
                            <td className="px-6 py-4">
                                <input 
                                    type="date" 
                                    disabled={isSelf}
                                    className="border rounded px-2 py-1 text-sm bg-white"
                                    value={new Date(user.expirationDate).toISOString().split('T')[0]}
                                    onChange={(e) => handleDateChange(user, e.target.value)}
                                />
                            </td>
                            <td className="px-6 py-4">
                            {!isSelf && (
                                <div className="flex items-center gap-2">
                                    <div className="relative w-24">
                                        <span className="absolute left-2 top-1.5 text-gray-500 text-xs">R$</span>
                                        <input 
                                            type="number"
                                            className="w-full pl-6 pr-2 py-1 border rounded text-sm"
                                            value={inputPrices[user.id] || ''}
                                            onChange={(e) => handlePriceChange(user.id, e.target.value)}
                                            placeholder="29.90"
                                        />
                                    </div>
                                    <Button size="sm" onClick={() => handleRenewSubscription(user)} disabled={isLoading}>
                                        Pagar
                                    </Button>
                                </div>
                            )}
                            </td>
                        </tr>
                        );
                    })}
                    </tbody>
                </table>
                </div>
            </div>
        </>
      )}

      {/* --- TAB: DATABASE --- */}
      {activeTab === 'DATABASE' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <div>
                    <h3 className="font-bold text-gray-900">Estrutura do Banco de Dados (SQL)</h3>
                    <p className="text-xs text-gray-500">Execute este script no "SQL Editor" do Supabase para configurar as tabelas.</p>
                  </div>
                  <Button onClick={copyToClipboard} variant="secondary" size="sm">
                      {copied ? (
                          <>
                            <svg className="w-4 h-4 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Copiado!
                          </>
                      ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                            Copiar SQL
                          </>
                      )}
                  </Button>
              </div>
              <div className="relative">
                <pre className="p-6 bg-slate-900 text-slate-300 text-xs overflow-auto max-h-[600px] font-mono leading-relaxed">
                    {SUPABASE_SCHEMA_SQL}
                </pre>
              </div>
          </div>
      )}
    </div>
  );
};
