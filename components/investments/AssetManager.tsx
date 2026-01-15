import React, { useState, useEffect } from 'react';
import { InvestmentAsset, User, InvestmentType, InvestmentTransaction } from '../../types';
import { dataService } from '../../services/dataService';

interface AssetManagerProps {
    assets: InvestmentAsset[];
    user: User;
    onUpdate: () => void;
    onTransaction: (asset: InvestmentAsset) => void;
}

export function AssetManager({ assets, user, onUpdate, onTransaction }: AssetManagerProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newAsset, setNewAsset] = useState<Partial<InvestmentAsset>>({
        name: '',
        ticker: '',
        type: 'STOCK',
        currentPrice: 0
    });

    // State for transaction history
    const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const handleAddAsset = async () => {
        if (!newAsset.name || !newAsset.type) return;
        await dataService.createAsset(user.id, newAsset);
        setIsAdding(false);
        setNewAsset({ name: '', ticker: '', type: 'STOCK', currentPrice: 0 });
        onUpdate();
    };

    const toggleExpand = async (assetId: string) => {
        if (expandedAssetId === assetId) {
            setExpandedAssetId(null);
            setTransactions([]);
        } else {
            setExpandedAssetId(assetId);
            setLoadingHistory(true);
            const allTransactions = await dataService.getInvestmentTransactions(user.id);
            // Filter in memory for now, ideally backend filter by assetId
            const assetTransactions = allTransactions.filter((t: InvestmentTransaction) => t.assetId === assetId);
            setTransactions(assetTransactions);
            setLoadingHistory(false);
        }
    };

    const getProfit = (asset: InvestmentAsset) => {
        const invested = asset.quantity * asset.averagePrice;
        const current = asset.quantity * asset.currentPrice;
        return current - invested;
    };

    const getProfitPercent = (asset: InvestmentAsset) => {
        const invested = asset.quantity * asset.averagePrice;
        if (invested === 0) return 0;
        return ((getProfit(asset) / invested) * 100);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Minha Carteira</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Novo Ativo
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Ativo</th>
                            <th className="px-6 py-3 font-semibold">Tipo</th>
                            <th className="px-6 py-3 font-semibold text-right">Qtd.</th>
                            <th className="px-6 py-3 font-semibold text-right">Preço Médio</th>
                            <th className="px-6 py-3 font-semibold text-right">Preço Atual</th>
                            <th className="px-6 py-3 font-semibold text-right">Saldo</th>
                            <th className="px-6 py-3 font-semibold text-right">L/P</th>
                            <th className="px-6 py-3 font-semibold text-center"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {assets.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-gray-400 text-sm">
                                    Nenhum ativo cadastrado. Comece adicionando um!
                                </td>
                            </tr>
                        ) : (
                            assets.map((asset) => {
                                const profit = getProfit(asset);
                                const profitPercent = getProfitPercent(asset);
                                const isExpanded = expandedAssetId === asset.id;

                                return (
                                    <React.Fragment key={asset.id}>
                                        <tr
                                            className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`}
                                            onClick={() => toggleExpand(asset.id)}
                                        >
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="font-semibold text-gray-800">{asset.ticker || asset.name}</div>
                                                    {asset.ticker && <div className="text-xs text-gray-400">{asset.name}</div>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                                                    {asset.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-600 font-medium">{asset.quantity}</td>
                                            <td className="px-6 py-4 text-right text-gray-600">
                                                {(asset.averagePrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-600">
                                                {(asset.currentPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-800">
                                                {(asset.quantity * asset.currentPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`text-sm font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </div>
                                                <div className={`text-xs ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {profitPercent.toFixed(2)}%
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </td>
                                        </tr>

                                        {isExpanded && (
                                            <tr className="bg-gray-50 animate-fadeIn">
                                                <td colSpan={8} className="p-4 sm:p-6">
                                                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                                        <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                                                            <h4 className="text-sm font-bold text-gray-700">Histórico de Movimentações</h4>
                                                        </div>
                                                        {loadingHistory ? (
                                                            <div className="p-8 text-center text-gray-400 text-sm">Carregando histórico...</div>
                                                        ) : transactions.length === 0 ? (
                                                            <div className="p-8 text-center text-gray-400 text-sm">Nenhuma movimentação encontrada.</div>
                                                        ) : (
                                                            <table className="w-full text-left text-sm">
                                                                <thead className="text-xs text-gray-400 uppercase bg-white border-b border-gray-100">
                                                                    <tr>
                                                                        <th className="px-4 py-3 font-medium">Data</th>
                                                                        <th className="px-4 py-3 font-medium">Tipo</th>
                                                                        <th className="px-4 py-3 font-medium text-right">Qtd</th>
                                                                        <th className="px-4 py-3 font-medium text-right">Preço</th>
                                                                        <th className="px-4 py-3 font-medium text-right">Total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-50">
                                                                    {transactions.map((tx) => (
                                                                        <tr key={tx.id} className="hover:bg-gray-50">
                                                                            <td className="px-4 py-3 text-gray-600">{new Date(tx.date).toLocaleDateString()}</td>
                                                                            <td className="px-4 py-3">
                                                                                <span className={`text-xs px-2 py-1 rounded font-bold ${tx.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                                    {tx.type === 'BUY' ? 'COMPRA' : 'VENDA'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right text-gray-600">{tx.quantity}</td>
                                                                            <td className="px-4 py-3 text-right text-gray-600">
                                                                                {tx.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right font-medium text-gray-800">
                                                                                {tx.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ADD ASSET MODAL */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-scaleIn">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">Novo Ativo</h3>
                            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ticker (Opcional)</label>
                                <input
                                    type="text"
                                    value={newAsset.ticker}
                                    onChange={e => setNewAsset({ ...newAsset, ticker: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-300"
                                    placeholder="EX: PETR4"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Ativo</label>
                                <input
                                    type="text"
                                    value={newAsset.name}
                                    onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-300"
                                    placeholder="Ex: Petrobras PN"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                    <select
                                        value={newAsset.type}
                                        onChange={e => setNewAsset({ ...newAsset, type: e.target.value as InvestmentType })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    >
                                        <option value="STOCK">Ação</option>
                                        <option value="REIT">FII</option>
                                        <option value="FIXED_INCOME">Renda Fixa</option>
                                        <option value="CRYPTO">Cripto</option>
                                        <option value="OTHER">Outro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço Atual</label>
                                    <input
                                        type="number"
                                        value={newAsset.currentPrice}
                                        onChange={e => setNewAsset({ ...newAsset, currentPrice: Number(e.target.value) })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors">Cancelar</button>
                            <button
                                onClick={handleAddAsset}
                                disabled={!newAsset.name}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
                            >
                                Salvar Ativo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
