
import React, { useState, useEffect, useMemo } from 'react';
import { User, Plan, PaymentStatus } from '../../types';
import { authService } from '../../services/authService';
import { dataService } from '../../services/dataService';
import { useSubscriptionManager } from '../../controllers/SubscriptionController';
import { InvoiceList } from '../subscription/InvoiceList';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabaseClient';

interface ClientManagementViewProps {
    user: User;
    onClose: () => void;
    onSave: (userId: string, data: Partial<User>) => Promise<void>;
}

const ClientManagementView: React.FC<ClientManagementViewProps> = ({ user, onClose, onSave }) => {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [accountType, setAccountType] = useState(user.accountType);
    const [document, setDocument] = useState(user.document || '');
    const [role, setRole] = useState(user.role);
    const [planId, setPlanId] = useState(user.planId || '');
    const [paymentStatus, setPaymentStatus] = useState(user.paymentStatus);
    const [expirationDate, setExpirationDate] = useState(user.expirationDate.split('T')[0]);
    const [subscriptionPrice, setSubscriptionPrice] = useState(user.subscriptionPrice || 0);
    const [isLoading, setIsLoading] = useState(false);
    const [plans, setPlans] = useState<any[]>([]);

    // Controller Hook Integration
    const { invoices, refreshInvoices, validateDoc, calculateNewExpiration } = useSubscriptionManager();

    useEffect(() => {
        dataService.getPlans().then(setPlans);
        refreshInvoices(user.id);
    }, [user.id, refreshInvoices]);

    const handlePlanChange = (selectedPlanId: string) => {
        setPlanId(selectedPlanId);
        const plan = plans.find(p => p.id === selectedPlanId);
        if (plan) {
            setSubscriptionPrice(Number(plan.price));
            const newExp = calculateNewExpiration(new Date().toISOString(), plan.interval);
            setExpirationDate(newExp.split('T')[0]);
        }
    };

    const handleDocumentChange = (val: string) => {
        let value = val.replace(/\D/g, '');
        if (accountType === 'PERSONAL') {
            if (value.length > 11) value = value.slice(0, 11);
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            if (value.length > 14) value = value.slice(0, 14);
            value = value.replace(/^(\d{2})(\d)/, '$1.$2');
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
        }
        setDocument(value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const type = accountType === 'BUSINESS' ? 'BUSINESS' : 'PERSONAL';
        const isValidDoc = validateDoc(document, type);
        
        if(!isValidDoc && document.length > 0) {
            alert(`Documento inválido para ${accountType === 'PERSONAL' ? 'Pessoa Física' : 'Pessoa Jurídica'}`);
            return;
        }

        setIsLoading(true);
        try {
            await onSave(user.id, {
                name,
                email,
                accountType,
                document,
                role,
                planId,
                paymentStatus,
                expirationDate: new Date(expirationDate).toISOString(),
                subscriptionPrice
            });
            onClose();
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar alterações.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up pb-[100px]">
             <div className="flex items-center gap-4 mb-2">
                <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-200 text-gray-500 hover:text-gray-900 group">
                    <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Gerenciar Cliente</h2>
                    <p className="text-sm text-gray-500 font-medium">{user.name} â€¢ {user.email}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna da Esquerda: Dados Cadastrais */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-sm ring-1 ring-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                        
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                                Dados do Perfil
                            </h3>
                            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ID:</span>
                                <span className="text-[10px] font-mono font-bold text-gray-600 uppercase">{user.id.slice(0, 8)}...</span>
                            </div>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Nome / Razão Social</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-3.5 bg-gray-50 hover:bg-gray-100 focus:bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 text-gray-900 font-bold transition-all outline-none" required />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">E-mail de Contato</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-3.5 bg-gray-50 hover:bg-gray-100 focus:bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 text-gray-900 font-medium transition-all outline-none" required />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Nível Administrativo</label>
                                    <div className="relative">
                                        <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full px-5 py-3.5 bg-gray-50 hover:bg-gray-100 focus:bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 text-blue-600 font-bold transition-all outline-none appearance-none cursor-pointer">
                                            <option value="USER">USUÁRIO PADRÃO (CLIENTE)</option>
                                            <option value="ADMIN">ADMINISTRADOR DO SISTEMA</option>
                                            <option value="SUPER_ADMIN">SUPER USUÁRIO (ROOT)</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Categoria de Entidade</label>
                                     <div className="relative">
                                        <select value={accountType} onChange={e => setAccountType(e.target.value as any)} className="w-full px-5 py-3.5 bg-gray-50 hover:bg-gray-100 focus:bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 text-gray-900 font-medium transition-all outline-none appearance-none cursor-pointer">
                                            <option value="PERSONAL">PESSOA FÍSICA (CPF)</option>
                                            <option value="BUSINESS">PESSOA JURÍDICA (CNPJ)</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Documento Oficial ({accountType === 'PERSONAL' ? 'CPF' : 'CNPJ'})</label>
                                    <input type="text" value={document} onChange={e => handleDocumentChange(e.target.value)} className="w-full px-5 py-3.5 bg-gray-50 hover:bg-gray-100 focus:bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 text-gray-900 font-medium transition-all outline-none checked:bg-blue-500" placeholder={accountType === 'PERSONAL' ? "000.000.000-00" : "00.000.000/0000-00"} />
                                </div>
                            </div>
                        </div>

                        {/* Lista de Faturas */}
                        <div className="mt-8 pt-8 border-t border-gray-100">
                             <InvoiceList invoices={invoices} />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button type="button" variant="outline" className="h-14 px-8 rounded-xl font-bold uppercase text-xs flex-1 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-600" onClick={onClose}>Abandonar Alterações</Button>
                        <Button type="submit" className="h-14 px-8 rounded-xl font-bold uppercase text-xs flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all hover:-translate-y-0.5" isLoading={isLoading}>Consolidar Mudanças</Button>
                    </div>
                </div>

                {/* Coluna da Direita: Status e Assinatura */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-sm ring-1 ring-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-amber-400"></div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            </div>
                            Financeiro
                        </h3>

                        <div className="space-y-8">
                            <div className="p-6 bg-gray-50 rounded-[1.5rem] hover:bg-gray-100 transition-colors">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Plano Atual</label>
                                <select value={planId} onChange={e => handlePlanChange(e.target.value)} className="w-full bg-transparent outline-none font-black text-xl text-gray-900 appearance-none cursor-pointer">
                                    <option value="">NENHUM</option>
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>

                            <div className={`p-6 rounded-[1.5rem] border transition-all ${
                                paymentStatus === 'PAID' ? 'bg-green-50 border-green-100 text-green-700' : 
                                paymentStatus === 'OVERDUE' ? 'bg-amber-50 border-amber-100 text-amber-700' : 
                                paymentStatus === 'SUSPENDED' ? 'bg-red-50 border-red-100 text-red-700' :
                                'bg-gray-50 border-gray-100 text-gray-700'
                            }`}>
                                <label className="block text-[10px] font-black opacity-60 uppercase tracking-widest mb-3">Status de Cobrança</label>
                                <div className="relative">
                                    <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as any)} className="w-full bg-transparent outline-none font-black text-base uppercase cursor-pointer appearance-none">
                                        <option value="PAID">PAGAMENTO OK</option>
                                        <option value="PENDING">PENDENTE</option>
                                        <option value="OVERDUE">ATRASADO</option>
                                        <option value="SUSPENDED">SUSPENSO (BLOQUEADO)</option>
                                    </select>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>


                            <div className="px-1">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Expira em</label>
                                <div className="relative">
                                    <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-gray-800 text-lg shadow-sm" />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="px-1">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Valor Unitário</label>
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400 group-focus-within:text-blue-500 transition-colors">R$</span>
                                    <input type="number" step="0.01" value={subscriptionPrice} onChange={e => setSubscriptionPrice(Number(e.target.value))} className="w-full pl-14 pr-6 py-4 bg-white border border-gray-200 rounded-2xl focus:border-blue-500 outline-none transition-all font-black text-3xl text-gray-800 shadow-sm" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

interface AdminUsersProps {
    currentUser?: User | null;
    onImpersonate?: (user: User) => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ currentUser, onImpersonate }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'OVERDUE' | 'EXPIRING_SOON'>('ALL');
    const [searchEmail, setSearchEmail] = useState('');
    const [isSearchingEmail, setIsSearchingEmail] = useState(false);
    const [emailFeedback, setEmailFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

    const handleDirectEmailAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailFeedback(null);
        const trimmed = searchEmail.trim().toLowerCase();
        if (!trimmed) {
            setEmailFeedback({ type: 'error', message: 'Por favor, insira o e-mail de cadastro do usuário.' });
            return;
        }

        // 1. Check in already loaded list
        const found = users.find(u => u.email.toLowerCase() === trimmed);
        if (found) {
            if (found.id === currentUser?.id) {
                setEmailFeedback({ type: 'error', message: 'Você já está conectado como este administrador.' });
                return;
            }
            if (onImpersonate) {
                onImpersonate(found);
            }
            return;
        }

        // 2. Query Supabase directly
        setIsSearchingEmail(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .ilike('email', trimmed)
                .single();

            if (error || !data) {
                setEmailFeedback({ type: 'error', message: `Nenhum usuário encontrado com o e-mail "${searchEmail.trim()}".` });
                return;
            }

            if (data.id === currentUser?.id) {
                setEmailFeedback({ type: 'error', message: 'Este e-mail pertence à sua própria conta de administrador.' });
                return;
            }

            const targetUser: User = {
                id: data.id,
                name: data.name,
                email: data.email,
                role: data.role || 'USER',
                isActive: data.is_active,
                createdAt: data.created_at,
                expirationDate: data.expiration_date,
                subscriptionStartDate: data.subscription_start_date,
                paymentStatus: data.payment_status || 'PENDING',
                subscriptionPrice: data.subscription_price,
                planId: data.plan_id,
                accountType: data.account_type || 'PERSONAL',
                document: data.document,
                subUsers: data.sub_users || [],
                ownerId: data.owner_id
            };

            if (onImpersonate) {
                onImpersonate(targetUser);
            }
        } catch (err: any) {
            console.error('Erro ao buscar usuário por email:', err);
            setEmailFeedback({ type: 'error', message: 'Erro ao consultar o banco de dados.' });
        } finally {
            setIsSearchingEmail(false);
        }
    };

    const loadUsers = async () => {
        setIsLoading(true);
        let allUsers = await authService.getUsers();
        const now = new Date();
        const updatesPromises: Promise<void>[] = [];
        let stateChanged = false;

        // AUTO-BLOCK LOGIC
        allUsers.forEach(user => {
            if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && user.isActive) {
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
        setIsLoading(false);
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

    const handleSaveUpdates = async (userId: string, updates: Partial<User>) => {
        await authService.updateUser(userId, updates);
        await loadUsers();
    };

    const filteredUsers = useMemo(() => {
        const now = new Date();
        const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        return users.filter(user => {
            if (filterStatus === 'OVERDUE') return user.paymentStatus === 'OVERDUE' || new Date(user.expirationDate) < now;
            if (filterStatus === 'EXPIRING_SOON') {
                const exp = new Date(user.expirationDate);
                return exp >= now && exp <= next7Days;
            }
            return true;
        });
    }, [users, filterStatus]);

    const stats = useMemo(() => {
        const clientUsers = users.filter(u => u.role === 'USER');
        const totalRevenue = clientUsers.reduce((acc, u) => acc + (u.subscriptionPrice || 0), 0);
        const activeCount = clientUsers.filter(u => u.isActive).length;
        const now = new Date();
        const overdueCount = clientUsers.filter(u => u.paymentStatus === 'OVERDUE' || new Date(u.expirationDate) < now).length;

        return { totalUsers: clientUsers.length, activeCount, overdueCount, totalRevenue };
    }, [users]);

    if (editingUser) {
        return (
            <ClientManagementView
                user={editingUser}
                onClose={() => setEditingUser(null)}
                onSave={handleSaveUpdates}
            />
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Direct Email Access Card */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="max-w-xl">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </span>
                        <h3 className="text-sm font-bold tracking-tight text-white uppercase">Acesso Direto por E-mail (Modo Suporte)</h3>
                    </div>
                    <p className="text-xs text-slate-300">
                        Acesse imediatamente a conta e o painel financeiro de qualquer cliente informando apenas o e-mail de cadastro.
                    </p>
                </div>

                <form onSubmit={handleDirectEmailAccess} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    <div className="relative min-w-[260px] sm:min-w-[320px]">
                        <input
                            type="email"
                            placeholder="exemplo@cliente.com"
                            value={searchEmail}
                            onChange={(e) => {
                                setSearchEmail(e.target.value);
                                if (emailFeedback) setEmailFeedback(null);
                            }}
                            className="w-full px-3.5 py-2 pl-9 bg-slate-950/80 border border-slate-700 text-white placeholder-slate-400 rounded-xl text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                    </div>
                    <button
                        type="submit"
                        disabled={isSearchingEmail}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                    >
                        {isSearchingEmail ? (
                            <span>Buscando...</span>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                                <span>Acessar Conta</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
            {emailFeedback && (
                <div className={`p-3 rounded-xl text-xs font-medium border animate-fade-in ${emailFeedback.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                    {emailFeedback.message}
                </div>
            )}

            {/* Header and Filters */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Gestão de Clientes & Assinaturas</h2>
                    <p className="text-gray-500 text-sm">Controle financeiro, planos e vencimentos.</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant={filterStatus === 'ALL' ? 'primary' : 'outline'} 
                        size="sm" 
                        onClick={() => setFilterStatus('ALL')}
                    >
                        Todos
                    </Button>
                    <Button 
                        variant={filterStatus === 'EXPIRING_SOON' ? 'primary' : 'outline'} 
                        size="sm" 
                        className={filterStatus === 'EXPIRING_SOON' ? 'bg-amber-600 border-amber-600' : 'text-amber-700 border-amber-200'}
                        onClick={() => setFilterStatus('EXPIRING_SOON')}
                    >
                        Vencendo (7 dias)
                    </Button>
                    <Button 
                        variant={filterStatus === 'OVERDUE' ? 'primary' : 'outline'} 
                        size="sm" 
                        className={filterStatus === 'OVERDUE' ? 'bg-red-600 border-red-600' : 'text-red-700 border-red-200'}
                        onClick={() => setFilterStatus('OVERDUE')}
                    >
                        Inadimplentes
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Receita Mensal</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
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

            {/* User List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                            <tr>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4 text-center">Status Pagto.</th>
                                <th className="px-6 py-4 text-center">Acesso App</th>
                                <th className="px-6 py-4">Vencimento</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map((user) => {
                                const now = new Date();
                                const expirationDate = new Date(user.expirationDate);
                                const isExpired = now > expirationDate || user.paymentStatus === 'OVERDUE';
                                const isStaff = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

                                let badge;
                                if (isStaff) badge = <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">CORTESIA</span>;
                                else if (user.paymentStatus === 'PAID' && !isExpired) badge = <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1 inline-flex"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>PAGO</span>;
                                else if (user.paymentStatus === 'PENDING') badge = <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1 inline-flex"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>PENDENTE</span>;
                                else badge = <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1 inline-flex animate-pulse"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>ATRASADO</span>;

                                const btnClass = user.isActive
                                    ? "bg-white text-green-700 border-green-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                                    : "bg-red-50 text-red-700 border-red-200 hover:bg-green-50 hover:text-green-600";

                                return (
                                    <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${isExpired && !isStaff ? 'bg-red-50/20' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">{badge}</td>
                                        <td className="px-6 py-4 text-center">
                                            {isStaff ? <span className="font-bold text-[10px] uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded">STAFF</span> : (
                                                <button
                                                    onClick={() => handleToggleActive(user)}
                                                    disabled={isLoading}
                                                    className={`w-full max-w-[100px] px-3 py-1 rounded-md text-[10px] font-bold border transition-all ${btnClass}`}
                                                >
                                                    {user.isActive ? 'LIBERADO' : 'BLOQUEADO'}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="date"
                                                disabled={isStaff}
                                                className="border rounded px-2 py-1 text-sm bg-white"
                                                value={new Date(user.expirationDate).toISOString().split('T')[0]}
                                                onChange={(e) => handleDateChange(user, e.target.value)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {onImpersonate && user.id !== currentUser?.id && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        onClick={() => onImpersonate(user)} 
                                                        className="px-2.5 py-1.5 flex items-center gap-1.5 font-bold text-[10px] text-amber-700 bg-amber-50/50 border-amber-300 hover:bg-amber-100 hover:border-amber-400 hover:text-amber-900 transition-all shadow-xs"
                                                        title={`Acessar conta de ${user.name}`}
                                                    >
                                                        <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                        </svg>
                                                        ACESSAR CONTA
                                                    </Button>
                                                )}
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => setEditingUser(user)} 
                                                    className="px-3 py-1.5 flex items-center gap-1.5 font-bold text-[10px]"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                                    GERENCIAR
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
