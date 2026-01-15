
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../types';
import { authService } from '../../services/authService';
import { Button } from '../ui/Button';

export const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [inputPrices, setInputPrices] = useState<Record<string, number>>({});

    const loadUsers = async () => {
        setIsLoading(true);
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

        const prices: Record<string, number> = {};
        allUsers.forEach(u => {
            prices[u.id] = u.subscriptionPrice || 29.90;
        });
        setInputPrices(prices);
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
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Gerenciamento de Usuários</h2>
                    <p className="text-gray-500 text-sm">Controle de acessos, licenças e perfis.</p>
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

                                let badge;
                                if (user.role === 'ADMIN') badge = <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">Isento</span>;
                                else if (isExpired) badge = <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800 animate-pulse">Atrasado</span>;
                                else badge = <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Em Dia</span>;

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
                                            {isSelf ? <span className="font-bold text-xs uppercase text-blue-600">Super Admin</span> : (
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
        </div>
    );
};
