
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../types';
import { authService } from '../../services/authService';
import { dataService } from '../../services/dataService';
import { Button } from '../ui/Button';

interface ClientManagementViewProps {
    user: User;
    onClose: () => void;
    onSave: (userId: string, updates: Partial<User>) => Promise<void>;
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

    useEffect(() => {
        dataService.getPlans().then(setPlans);
    }, []);

    const handlePlanChange = (selectedPlanId: string) => {
        setPlanId(selectedPlanId);
        const plan = plans.find(p => p.id === selectedPlanId);
        if (plan) {
            setSubscriptionPrice(Number(plan.price));
            const newExp = authService.calculateExpiration(plan.interval);
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
                    <p className="text-sm text-gray-500 font-medium">{user.name} • {user.email}</p>
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
                                    <input type="text" value={document} onChange={e => handleDocumentChange(e.target.value)} className="w-full px-5 py-3.5 bg-gray-50 hover:bg-gray-100 focus:bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 text-gray-900 font-medium transition-all outline-none" placeholder={accountType === 'PERSONAL' ? "000.000.000-00" : "00.000.000/0000-00"} />
                                </div>
                            </div>
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
                                'bg-amber-50 border-amber-100 text-amber-700'
                            }`}>
                                <label className="block text-[10px] font-black opacity-60 uppercase tracking-widest mb-3">Status de Cobrança</label>
                                <div className="relative">
                                    <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as any)} className="w-full bg-transparent outline-none font-black text-base uppercase cursor-pointer appearance-none">
                                        <option value="PAID">PAGAMENTO OK</option>
                                        <option value="PENDING">PENDENTE</option>
                                        <option value="OVERDUE">ATRASADO</option>
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

export const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'OVERDUE' | 'EXPIRING_SOON'>('ALL');

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
