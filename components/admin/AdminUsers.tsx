
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../types';
import { authService } from '../../services/authService';
import { dataService } from '../../services/dataService';
import { Button } from '../ui/Button';

interface UserEditModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onSave: (userId: string, updates: Partial<User>) => Promise<void>;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ user, isOpen, onClose, onSave }) => {
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

    if (!isOpen) return null;

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
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="text-lg font-bold text-gray-900">Editar Cadastro: {user.name}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome / Razão Social</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role (Papel)</label>
                            <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="USER">USER</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Perfil</label>
                            <select value={accountType} onChange={e => setAccountType(e.target.value as any)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="PERSONAL">Pessoal (CPF)</option>
                                <option value="BUSINESS">Empresa (CNPJ)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF/CNPJ</label>
                            <input type="text" value={document} onChange={e => handleDocumentChange(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder={accountType === 'PERSONAL' ? "000.000.000-00" : "00.000.000/0000-00"} />
                        </div>
                        <div className="border-t border-gray-100 col-span-2 pt-4">
                            <h4 className="text-sm font-bold text-gray-900 mb-3">Controle de Assinatura</h4>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Plano</label>
                            <select value={planId} onChange={e => handlePlanChange(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">Selecione um plano</option>
                                {plans.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} - R$ {Number(p.price).toFixed(2)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status Pagamento</label>
                            <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as any)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="PAID">Pago</option>
                                <option value="PENDING">Pendente</option>
                                <option value="OVERDUE">Atrasado</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vencimento (Overrule)</label>
                            <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Recorrente</label>
                            <input type="number" value={subscriptionPrice} onChange={e => setSubscriptionPrice(Number(e.target.value))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" className="flex-1" isLoading={isLoading}>Salvar Alterações</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

    return (
        <div className="space-y-6 animate-fade-in">
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
                                const isSelf = user.role === 'SUPER_ADMIN';
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
                                    <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${isExpired && !isSelf ? 'bg-red-50/20' : ''}`}>
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
                                                disabled={isSelf}
                                                className="border rounded px-2 py-1 text-sm bg-white"
                                                value={new Date(user.expirationDate).toISOString().split('T')[0]}
                                                onChange={(e) => handleDateChange(user, e.target.value)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => { setEditingUser(user); setIsEditModalOpen(true); }} className="px-3 py-1.5 flex items-center gap-1.5 font-bold text-[10px]">
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

            {editingUser && (
                <UserEditModal
                    user={editingUser}
                    isOpen={isEditModalOpen}
                    onClose={() => { setIsEditModalOpen(false); setEditingUser(null); }}
                    onSave={handleSaveUpdates}
                />
            )}
        </div>
    );
};
