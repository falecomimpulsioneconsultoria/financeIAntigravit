import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { InvestmentAsset, User } from '../../types';
import { dataService } from '../../services/dataService';
import { AssetManager } from './AssetManager';
import { InvestmentTransactionForm } from './InvestmentTransactionForm';
import { EarningsDashboard } from './EarningsDashboard';

interface InvestmentDashboardProps {
    user: User;
}

export function InvestmentDashboard({ user }: InvestmentDashboardProps) {
    const [assets, setAssets] = useState<InvestmentAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [selectedAssetForTransaction, setSelectedAssetForTransaction] = useState<InvestmentAsset | null>(null);

    useEffect(() => {
        loadAssets();
    }, [user.id]);

    const loadAssets = async () => {
        setLoading(true);
        const data = await dataService.getAssets(user.id);
        setAssets(data);
        setLoading(false);
    };

    const allocationData = useMemo(() => {
        const map = new Map<string, number>();
        assets.forEach(asset => {
            const value = asset.quantity * asset.currentPrice;
            const typeLabel = {
                'STOCK': 'Ações',
                'REIT': 'FIIs',
                'FIXED_INCOME': 'Renda Fixa',
                'CRYPTO': 'Cripto',
                'OTHER': 'Outros'
            }[asset.type] || asset.type;

            map.set(typeLabel, (map.get(typeLabel) || 0) + value);
        });

        return Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [assets]);

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#9CA3AF'];

    const totalInvested = assets.reduce((acc, asset) => acc + (asset.quantity * asset.currentPrice), 0);
    const totalCost = assets.reduce((acc, asset) => acc + (asset.quantity * asset.averagePrice), 0);
    const profit = totalInvested - totalCost;
    const profitPercentage = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    const handleTransactionClick = (asset: InvestmentAsset) => {
        setSelectedAssetForTransaction(asset);
        setShowTransactionModal(true);
    };

    const handleCloseModal = () => {
        setShowTransactionModal(false);
        setSelectedAssetForTransaction(null);
        loadAssets(); // Reload to update values
    };

    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EARNINGS'>('OVERVIEW');

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Investimentos</h1>
                    <p className="text-sm text-gray-500">Gerencie sua carteira de ativos</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setSelectedAssetForTransaction(null);
                            setShowTransactionModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Nova Transação
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('OVERVIEW')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'OVERVIEW'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Visão Geral
                    </button>
                    <button
                        onClick={() => setActiveTab('EARNINGS')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'EARNINGS'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Proventos
                    </button>
                </nav>
            </div>

            {activeTab === 'OVERVIEW' ? (
                <>
                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-sm font-medium text-gray-500 mb-1">Patrimônio Total</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                {totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </h3>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-sm font-medium text-gray-500 mb-1">Custo Total</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                {totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </h3>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-sm font-medium text-gray-500 mb-1">Lucro Estimado</p>
                            <div className="flex items-center gap-2">
                                <h3 className={`text-2xl font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </h3>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${profit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    {profit >= 0 ? '+' : ''}{profitPercentage.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* CONTENT GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* ASSET MANAGER (Take 2/3 width on large screens) */}
                        <div className="lg:col-span-2">
                            <AssetManager
                                assets={assets}
                                user={user}
                                onUpdate={loadAssets}
                                onTransaction={handleTransactionClick}
                            />
                        </div>

                        {/* ALOCATION CHART */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Alocação</h3>
                            <div className="h-64 w-full">
                                {allocationData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={allocationData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {allocationData.map((entry, index) => (
                                                    <Cell key={`cell - ${index} `} fill={COLORS[index % COLORS.length]} />
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
                                    <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        Sem dados
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <EarningsDashboard user={user} />
            )}

            {/* TRANSACTION MODAL */}
            {showTransactionModal && (
                <InvestmentTransactionForm
                    user={user}
                    asset={selectedAssetForTransaction}
                    assets={assets}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
}
