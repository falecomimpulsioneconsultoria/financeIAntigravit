import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../types';
import { authService } from '../../services/authService';
import { dataService } from '../../services/dataService';
import { Button } from '../ui/Button';

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        overdueUsers: 0,
        totalRevenue: 0,
        totalAccounts: 0,
        totalTransactions: 0,
        newUsersThisMonth: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [recentUsers, setRecentUsers] = useState<User[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

    const loadAdminData = async () => {
        setIsLoading(true);
        try {
            const users = await authService.getUsers();
            const allAccounts = await dataService.getAllAccountsForAdmin();
            const recentTxs = await dataService.getAllTransactionsForAdmin(5);
            
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            const clientUsers = users.filter(u => u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN');
            const activeUsersCount = clientUsers.filter(u => u.isActive).length;
            const overdueUsersCount = clientUsers.filter(u => new Date(u.expirationDate) < now).length;
            const totalRevenue = clientUsers.reduce((acc, u) => acc + (u.subscriptionPrice || 0), 0);
            const newUsersCount = clientUsers.filter(u => new Date(u.createdAt) >= firstDayOfMonth).length;

            setStats({
                totalUsers: clientUsers.length,
                activeUsers: activeUsersCount,
                overdueUsers: overdueUsersCount,
                totalRevenue,
                totalAccounts: allAccounts.length,
                totalTransactions: 0, 
                newUsersThisMonth: newUsersCount
            });

            setRecentUsers(users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5));
            setRecentTransactions(recentTxs);
        } catch (error) {
            console.error("Erro ao carregar dados do admin:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadAdminData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20 text-blue-600">
                <svg className="animate-spin h-10 w-10" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight">Painel de Controle</h2>
                    <p className="text-gray-500 font-medium">Bem-vindo, Super Admin. Aqui está o resumo da sua plataforma.</p>
                </div>
                <Button onClick={loadAdminData} variant="outline" size="sm" className="gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Atualizar
                </Button>
            </div>

            {/* Metricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Receita Mensal</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Clientes</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
                        <p className="text-[10px] text-green-600 font-semibold mt-1">+{stats.newUsersThisMonth} este mês</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Clientes Ativos</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{stats.activeUsers}</p>
                        <p className="text-[10px] text-gray-400 font-semibold mt-1">{stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : 0}% da base</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Inativos / Atraso</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">{stats.overdueUsers}</p>
                        <p className="text-[10px] text-red-400 font-semibold mt-1">Requer atenção</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Novos Usuários */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-900">Novos Usuários</h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {recentUsers.map(user => (
                                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-right text-[10px] shrink-0 ml-4">
                                        <p className="text-gray-400 font-medium">Cadastrado em</p>
                                        <p className="text-gray-900 font-bold">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Transações Recentes na Rede */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-900">Atividade Global</h3>
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Tempo Real</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {recentTransactions.length > 0 ? recentTransactions.map(tx => (
                                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tx.type === 'INCOME' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                {tx.type === 'INCOME' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />}
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-900 truncate">{tx.description}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{tx.profiles?.name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-4">
                                        <p className={`text-xs font-bold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                            {tx.type === 'INCOME' ? '+' : '-'} R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-[9px] text-gray-400 font-medium">{new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="p-10 text-center text-gray-400 text-sm italic">Nenhuma atividade recente.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                             <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                             Infraestrutura
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 font-medium">Contas Bancárias</span>
                                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold">{stats.totalAccounts}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 font-medium">Transações Estimadas</span>
                                <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-bold">~ {stats.totalUsers * 45}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                <span className="text-sm text-gray-700 font-bold">Saúde da DB</span>
                                <span className="text-green-600 text-xs font-bold flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    Estável
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-600 p-6 rounded-2xl shadow-lg text-white group overflow-hidden relative">
                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M11 2v20c-5.07 0-9.25-3.08-10.45-7.3l2.87-.63C4.14 16.92 7.22 19 11 19V5c3.78 0 6.86 2.08 7.58 4.93l2.87-.63C20.25 5.08 16.07 2 11 2z" /></svg>
                        </div>
                        <h3 className="font-bold text-lg mb-1 relative z-10">Suporte Premium</h3>
                        <p className="text-blue-100 text-xs mb-4 relative z-10">Centralize chamados e acompanhe o NPS do sistema.</p>
                        <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white hover:text-blue-600 border relative z-10">Ver Chamados</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
