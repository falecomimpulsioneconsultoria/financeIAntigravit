import React, { useState, useEffect } from 'react';
import { InvestmentAsset, User, InvestmentTransactionType } from '../../types';
import { dataService } from '../../services/dataService';

interface Props {
    user: User;
    asset?: InvestmentAsset | null;
    assets?: InvestmentAsset[];
    onClose: () => void;
}

export function InvestmentTransactionForm({ user, asset: initialAsset, assets = [], onClose }: Props) {
    const [selectedAssetId, setSelectedAssetId] = useState<string>(initialAsset?.id || '');
    const [type, setType] = useState<InvestmentTransactionType>('BUY');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [quantity, setQuantity] = useState(0);
    const [price, setPrice] = useState(0);
    const [fees, setFees] = useState(0);

    const selectedAsset = initialAsset || assets.find(a => a.id === selectedAssetId);

    useEffect(() => {
        if (selectedAsset) {
            setPrice(selectedAsset.currentPrice || 0);
        }
    }, [selectedAsset]);

    const isEarning = type === 'DIVIDEND' || type === 'JCP';
    const total = isEarning ? price : (quantity * price) + fees;

    const handleSubmit = async () => {
        if (!selectedAssetId || (!isEarning && quantity <= 0) || price <= 0) return;

        await dataService.addInvestmentTransaction(user.id, {
            assetId: selectedAssetId,
            type,
            date,
            quantity: isEarning ? 0 : quantity,
            price,
            fees,
            totalAmount: total
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-scaleIn">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Nova Transação</h3>
                        {initialAsset ? (
                            <p className="text-xs text-gray-500">{initialAsset.ticker || initialAsset.name}</p>
                        ) : (
                            <p className="text-xs text-gray-500 text-blue-600">Selecione o ativo</p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 space-y-4">

                    {/* ASSET SELECTOR IF NOT PRE-SELECTED */}
                    {!initialAsset && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Ativo</label>
                            <select
                                value={selectedAssetId}
                                onChange={e => setSelectedAssetId(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Selecione um ativo...</option>
                                {assets.map(a => (
                                    <option key={a.id} value={a.id}>{a.ticker || a.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* TYPE TOGGLE */}
                    <div className="flex p-1 bg-gray-100 rounded-xl overflow-x-auto">
                        <button
                            onClick={() => setType('BUY')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap px-2 ${type === 'BUY' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Compra
                        </button>
                        <button
                            onClick={() => setType('SELL')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap px-2 ${type === 'SELL' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Venda
                        </button>
                        <button
                            onClick={() => setType('DIVIDEND')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap px-2 ${type === 'DIVIDEND' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Dividendo
                        </button>
                        <button
                            onClick={() => setType('JCP')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap px-2 ${type === 'JCP' ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            JCP
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Data</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-500" />
                    </div>

                    <div className={`grid ${isEarning ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                        {!isEarning && (
                            <div className="animate-fadeIn">
                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Quantidade</label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={e => setQuantity(Number(e.target.value))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">
                                {isEarning ? 'Valor Total Recebido' : 'Preço Unitário'}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={price}
                                onChange={e => setPrice(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {!isEarning && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Taxas / Corretagem</label>
                            <input
                                type="number"
                                step="0.01"
                                value={fees}
                                onChange={e => setFees(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    )}

                    <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
                        <span className="text-sm font-medium text-gray-500">Total</span>
                        <span className="text-xl font-bold text-gray-900">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm">Cancelar</button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedAssetId}
                        className={`px-6 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed 
                        ${type === 'BUY' ? 'bg-emerald-600 shadow-emerald-500/30' :
                                type === 'SELL' ? 'bg-red-600 shadow-red-500/30' :
                                    'bg-blue-600 shadow-blue-500/30'}`}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}
