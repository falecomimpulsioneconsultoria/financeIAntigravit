import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { User, InvestmentTransaction } from '../../types';
import { dataService } from '../../services/dataService';

interface EarningsDashboardProps {
    user: User;
}

export function EarningsDashboard({ user }: EarningsDashboardProps) {
    const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        setLoading(true);
        const data = await dataService.getInvestmentTransactions(user.id);
        setTransactions(data.filter(t => t.type === 'DIVIDEND' || t.type === 'JCP'));
        setLoading(false);
    };

    const totalReceived = useMemo(() => {
        return transactions.reduce((acc, t) => acc + t.totalAmount, 0);
    }, [transactions]);

    const averageMonthly = useMemo(() => {
        if (transactions.length === 0) return 0;
        // Simple approximation: Total / 12 (or months active)
        // Better: Total / Unique months found
        const uniqueMonths = new Set(transactions.map(t => t.date.substring(0, 7))).size;
        return uniqueMonths > 0 ? totalReceived / uniqueMonths : 0;
    }, [transactions, totalReceived]);

    const monthlyData = useMemo(() => {
        const last12Months = new Map<string, number>();
        const today = new Date();

        // Initialize last 12 months with 0
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = d.toISOString().substring(0, 7); // YYYY-MM
            last12Months.set(key, 0);
        }

        transactions.forEach(t => {
            const key = t.date.substring(0, 7);
            if (last12Months.has(key)) {
                last12Months.set(key, (last12Months.get(key) || 0) + t.totalAmount);
            }
        });

        // Convert key YYYY-MM to Label (Mes/Ano)
        return Array.from(last12Months.entries()).map(([key, value]) => {
            const [year, month] = key.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            const label = date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
            return { name: label, value, fullDate: key };
        });
    }, [transactions]);

    const assetData = useMemo(() => {
        const map = new Map<string, number>();
        // We need asset name. The current getInvestmentTransactions logic returns assetId.
        // If we want detailed names, we might need to fetch assets or rely on the join done in dataService (frontend check required).
        // Checks dataService: it does `select *, asset:asset_id (ticker, name)` but explicitly maps to InvestmentTransaction which has `assetId`.
        // The return type in types.ts doesn't have `assetName` or `ticker`.
        // However, the `dataService` implementation I modified recently explicitly maps `asset: asset_id(ticker, name)` but the return object ONLY maps standard fields.
        // IMPORTANT: I need to update filtered data or use what's available.
        // Let's rely on assetId for now or check if dataService actually passes the joined object.
        // My previous edit to dataService mapped: 
        //   return (data || []).map((t: any) => ({ ..., assetId: t.asset_id, ... }));
        // It DID NOT map the joined `asset` object into the result.
        // So I won't have the ticker here unless I fetch assets again or update types/service.
        // Workaround: I'll fetch assets in this component too to map names.
        return map;
    }, [transactions]);

    // FETCH ASSETS TO MAP NAMES
    const [assetsMap, setAssetsMap] = useState<Map<string, string>>(new Map()); // id -> ticker/name
    useEffect(() => {
        dataService.getAssets(user.id).then(assets => {
            const map = new Map<string, string>();
            assets.forEach(a => map.set(a.id, a.ticker || a.name));
            setAssetsMap(map);
        });
    }, [user.id]);

    const pieData = useMemo(() => {
        const map = new Map<string, number>();
        transactions.forEach(t => {
            const name = assetsMap.get(t.assetId) || 'Desconhecido';
            map.set(name, (map.get(name) || 0) + t.totalAmount);
        });

        return Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5
    }, [transactions, assetsMap]);

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

    if (loading) return <div className="p-10 text-center text-gray-400">Carregando proventos...</div>;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* SUMMARIES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Recebido (12 Meses)</p>
                    <h3 className="text-3xl font-bold text-gray-900">
                        {totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <p className="text-sm font-medium text-gray-500 mb-1">Média Mensal</p>
                    <h3 className="text-3xl font-bold text-emerald-600">
                        {averageMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                </div>
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* BAR CHART - MONTHLY HISTORY */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Evolução de Proventos</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    tickFormatter={(value) => `R$${value}`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6' }}
                                    formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Recebido']}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="#10B981"
                                    radius={[4, 4, 0, 0]}
                                    barSize={32}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* PIE CHART - TOP PAYERS */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Top Pagadores</h3>
                    <div className="h-64 w-full">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm">
                                Sem dados de proventos
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
