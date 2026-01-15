
import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/dataService';

export const AdminAccounts: React.FC = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadAllAccounts();
    }, []);

    const loadAllAccounts = async () => {
        setIsLoading(true);
        const data = await dataService.getAllAccountsForAdmin();
        setAccounts(data);
        setIsLoading(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Todas as Contas Bancárias</h2>
                <p className="text-gray-500 text-sm">Gerenciamento global de contas criadas pelos usuários.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                            <tr>
                                <th className="px-6 py-4">Proprietário</th>
                                <th className="px-6 py-4">Nome da Conta</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4 text-right">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400">Carregando contas...</td>
                                </tr>
                            ) : accounts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400">Nenhuma conta encontrada.</td>
                                </tr>
                            ) : (
                                accounts.map((acc) => (
                                    <tr key={acc.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">{acc.profiles?.name}</p>
                                            <p className="text-xs text-gray-500">{acc.profiles?.email}</p>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-800">{acc.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                                                {acc.type}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${acc.balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
