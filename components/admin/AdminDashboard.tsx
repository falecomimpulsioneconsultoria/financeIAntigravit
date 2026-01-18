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
        mrr: 0, // Monthly Recurring Revenue
        totalManagedBalance: 0,
        newUsersThisMonth: 0,
        churnRate: 0,
        ltv: 0,
        forecast30d: 0,
        forecast60d: 0,
        forecast90d: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [recentUsers, setRecentUsers] = useState<User[]>([]);

    const loadAdminData = async () => {
        setIsLoading(true);
        try {
            const users = await authService.getUsers();
            const allAccounts = await dataService.getAllAccountsForAdmin();
            
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            const clientUsers = users.filter(u => u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN');
            const activeUsersCount = clientUsers.filter(u => u.isActive).length;
            const overdueUsersCount = clientUsers.filter(u => new Date(u.expirationDate) < now).length;
            const mrr = clientUsers.reduce((acc, u) => acc + (u.subscriptionPrice || 0), 0);
            const newUsersCount = clientUsers.filter(u => new Date(u.createdAt) >= firstDayOfMonth).length;
            const totalManagedBalance = allAccounts.reduce((acc, accnt) => acc + (accnt.balance || 0), 0);

            // Cálculos de Retenção e Previsão
            const churnRate = clientUsers.length > 0 ? (overdueUsersCount / clientUsers.length) * 100 : 0;
            const avgTicket = clientUsers.length > 0 ? mrr / clientUsers.length : 0;
            const ltv = churnRate > 0 ? avgTicket / (churnRate / 100) : avgTicket * 12; // Estimativa simples

            // Projeção baseada em vencimentos (agrupando por meses futuros)
            const forecast30d = clientUsers.filter(u => {
                const exp = new Date(u.expirationDate);
                const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                return u.isActive && exp <= next30;
            }).reduce((acc, u) => acc + (u.subscriptionPrice || 0), 0);

            const forecast60d = forecast30d + clientUsers.filter(u => {
                const exp = new Date(u.expirationDate);
                const start = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
                const end = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
                return u.isActive && exp >= start && exp <= end;
            }).reduce((acc, u) => acc + (u.subscriptionPrice || 0), 0);

            setStats({
                totalUsers: clientUsers.length,
                activeUsers: activeUsersCount,
                overdueUsers: overdueUsersCount,
                mrr,
                totalManagedBalance,
                newUsersThisMonth: newUsersCount,
                churnRate,
                ltv,
                forecast30d,
                forecast60d,
                forecast90d: forecast60d * 1.5 // Simplificação para o exemplo
            });

            setRecentUsers(users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5));
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
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight">Painel Executivo</h2>
                    <p className="text-gray-500 font-medium">Análise de Retenção, Crescimento e Projeção de Faturamento.</p>
                </div>
                <Button onClick={loadAdminData} variant="outline" size="sm" className="gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Atualizar Dados
                </Button>
            </div>

            {/* Metricas Principais - Foco em SaaS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 border-b-4 border-b-blue-500">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">MRR (Faturamento)</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">R$ {stats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 border-b-4 border-b-purple-500">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">LTV Estimado</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">R$ {stats.ltv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 border-b-4 border-b-red-500">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Churn Rate</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">{stats.churnRate.toFixed(1)}%</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 border-b-4 border-b-green-500">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-9.618 5.04c-.2 0-.398.02-.592.058V15.52a11.963 11.963 0 0010.21 11.838 11.963 11.963 0 0010.21-11.838V8.042c-.194-.038-.392-.058-.592-.058z" /></svg>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Retenção Ativa</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{stats.totalUsers > 0 ? (100 - stats.churnRate).toFixed(1) : 0}%</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Previsão de Receita (Forecast) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">Projeção Financeira</h3>
                                <p className="text-xs text-gray-500">Expectativa de renovações baseada nos vencimentos atuais.</p>
                            </div>
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002-2z" /></svg>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-gray-500">Próximos 30 dias</p>
                                <p className="text-2xl font-extrabold text-blue-600">R$ {stats.forecast30d.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-blue-600 h-full w-[100%]"></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-gray-500">Próximos 60 dias</p>
                                <p className="text-2xl font-extrabold text-indigo-600">R$ {stats.forecast60d.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-indigo-600 h-full w-[70%]" style={{ width: `${(stats.forecast60d / stats.mrr) * 50}%` }}></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-gray-500">Próximos 90 dias</p>
                                <p className="text-2xl font-extrabold text-purple-600">R$ {stats.forecast90d.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-purple-600 h-full w-[45%]" style={{ width: `${(stats.forecast90d / stats.mrr) * 30}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-blue-50/30 p-4 border-t border-gray-100">
                             <p className="text-[10px] text-blue-700 font-medium italic text-center">Valores baseados em 100% de taxa de renovação dos planos ativos.</p>
                        </div>
                    </div>

                    {/* Novos Usuários (Mantido para contexto de crescimento) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-900">Novos Leads / Clientes</h3>
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
                                            <p className="text-[10px] text-gray-400 truncate tracking-tight">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-right text-[10px] shrink-0 ml-4">
                                        <p className={`font-bold px-2 py-0.5 rounded-full mb-1 ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {user.isActive ? 'Ativo' : 'Expirado'}
                                        </p>
                                        <p className="text-gray-900 font-bold">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                             <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                             Infraestrutura & Saúde
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 font-medium">Montante sob Custódia</span>
                                <span className="text-gray-900 text-xs font-bold whitespace-nowrap">R$ {stats.totalManagedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 font-medium">Tickets de Suporte</span>
                                <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-bold">0 Pendentes</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                <span className="text-sm text-gray-700 font-bold">Disponibilidade</span>
                                <span className="text-green-600 text-xs font-bold flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    99.9%
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl shadow-lg text-white group overflow-hidden relative">
                        <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M11 2v20c-5.07-0-9.25-3.08-10.45-7.3l2.87-.63C4.14 16.92 7.22 19 11 19V5c3.78 0 6.86 2.08 7.58 4.93l2.87-.63C20.25 5.08 16.07 2 11 2z" /></svg>
                        </div>
                        <h3 className="font-bold text-lg mb-1 relative z-10">Meta de Crescimento</h3>
                        <p className="text-blue-100 text-xs mb-4 relative z-10">Faltam {(stats.totalUsers % 100) - 100} usuários para o próximo marco de 100.</p>
                        <div className="w-full bg-white/20 h-2 rounded-full mb-4">
                            <div className="bg-white h-full rounded-full" style={{ width: `${stats.totalUsers % 100}%` }}></div>
                        </div>
                        <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white hover:text-blue-600 border relative z-10">Exportar Relatório</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
