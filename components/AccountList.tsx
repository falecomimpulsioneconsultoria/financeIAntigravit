
import React, { useState, useMemo } from 'react';
import { Account, BankAccountType, Transaction } from '../types';
import { Button } from './ui/Button';
import { authService } from '../services/authService';

interface AccountListProps {
  accounts: Account[];
  transactions?: Transaction[];
  onAdd: (data: Omit<Account, 'id'>) => void;
  onEdit: (id: string, data: Omit<Account, 'id'>) => void;
  onDelete: (id: string) => void;
}

export const AccountList: React.FC<AccountListProps> = ({ accounts, transactions = [], onAdd, onEdit, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Account, 'id'>>({ name: '', balance: 0, color: 'blue', type: 'CHECKING' });

  const currentUser = authService.getCurrentUser();
  const canManage = currentUser?.activePermissions?.manageAccounts;

  const accountsWithProjection = useMemo(() => {
      return accounts.map(acc => {
          let pendingAmount = 0;
          transactions.forEach(t => {
              if (t.status === 'PENDING') {
                  if (t.accountId === acc.id) {
                      if (t.type === 'INCOME') pendingAmount += t.amount;
                      if (t.type === 'EXPENSE' || t.type === 'TRANSFER') pendingAmount -= t.amount;
                  }
                  if (t.type === 'TRANSFER' && t.toAccountId === acc.id) pendingAmount += t.amount;
              }
          });
          return { ...acc, projectedBalance: acc.balance + pendingAmount };
      });
  }, [accounts, transactions]);

  const totalBalance = useMemo(() => accounts.reduce((acc, curr) => acc + curr.balance, 0), [accounts]);
  const totalProjected = useMemo(() => accountsWithProjection.reduce((acc, curr) => acc + curr.projectedBalance, 0), [accountsWithProjection]);

  const resetForm = () => {
    setFormData({ name: '', balance: 0, color: 'blue', type: 'CHECKING' });
    setEditingId(null);
    setIsModalOpen(false);
    setIsSaving(false);
  };

  const handleEditClick = (account: Account) => {
    if (!canManage) return;
    setFormData({ name: account.name, balance: account.balance, color: account.color, type: account.type || 'CHECKING' });
    setEditingId(account.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setIsSaving(true);
    try {
        if (editingId) {
            await onEdit(editingId, formData);
        } else {
            await onAdd(formData);
        }
        resetForm();
    } catch (err) {
        console.error(err);
        alert("Falha ao salvar conta financeira.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    if (!canManage) return;
    if (window.confirm(`Tem certeza que deseja excluir a conta "${name}"?`)) onDelete(id);
  };
  
  const colors = [
    { name: 'Azul', value: 'blue', gradient: 'from-blue-500 to-blue-600', text: 'text-blue-600', light: 'bg-blue-50', bg: 'bg-blue-500' },
    { name: 'Verde', value: 'green', gradient: 'from-green-500 to-green-600', text: 'text-green-600', light: 'bg-green-50', bg: 'bg-green-500' },
    { name: 'Roxo', value: 'purple', gradient: 'from-purple-500 to-purple-600', text: 'text-purple-600', light: 'bg-purple-50', bg: 'bg-purple-500' },
    { name: 'Laranja', value: 'orange', gradient: 'from-orange-500 to-orange-600', text: 'text-orange-600', light: 'bg-orange-50', bg: 'bg-orange-500' },
    { name: 'Vermelho', value: 'red', gradient: 'from-red-500 to-red-600', text: 'text-red-600', light: 'bg-red-50', bg: 'bg-red-500' },
    { name: 'Amarelo', value: 'yellow', gradient: 'from-yellow-400 to-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-50', bg: 'bg-yellow-500' },
    { name: 'Cinza', value: 'gray', gradient: 'from-gray-500 to-gray-600', text: 'text-gray-600', light: 'bg-gray-50', bg: 'bg-gray-500' },
    { name: 'Rosa', value: 'pink', gradient: 'from-pink-500 to-pink-600', text: 'text-pink-600', light: 'bg-pink-50', bg: 'bg-pink-500' },
  ];

  const getTypeIcon = (type: BankAccountType) => {
      switch(type) {
          case 'INVESTMENT': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
          case 'CASH': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
          default: return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
      }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 border-b border-gray-100 pb-6">
        <div className="flex gap-8 items-end">
            <div><p className="text-sm text-gray-500 font-medium mb-1">Patrimônio Atual</p><h2 className="text-3xl font-bold text-gray-900">R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2></div>
            <div><p className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wide">Projeção Futura</p><h2 className={`text-xl font-bold ${totalProjected >= totalBalance ? 'text-blue-600' : 'text-orange-500'}`}>R$ {totalProjected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2></div>
        </div>
        {canManage && <Button onClick={() => setIsModalOpen(true)} className="shadow-lg shadow-blue-500/20 px-6"><svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Nova Conta</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accountsWithProjection.map(acc => {
          const cfg = colors.find(c => c.value === acc.color) || colors[0];
          return (
            <div key={acc.id} className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 overflow-hidden">
                <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-10 blur-2xl ${cfg.bg}`}></div>
                <div className={`h-1.5 w-full bg-gradient-to-r ${cfg.gradient}`}></div>
                <div className="p-6 relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.light} ${cfg.text}`}>{getTypeIcon(acc.type || 'CHECKING')}</div>
                        {canManage && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button onClick={() => handleEditClick(acc)} className="p-1.5 text-blue-600 bg-white border border-gray-100 hover:bg-blue-50 rounded-lg shadow-sm"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                <button onClick={() => handleDeleteClick(acc.id, acc.name)} className="p-1.5 text-rose-600 bg-white border border-gray-100 hover:bg-rose-50 rounded-lg shadow-sm"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                        )}
                    </div>
                    <div><h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Saldo Atual</h3><p className={`text-2xl font-bold ${acc.balance < 0 ? 'text-red-500' : 'text-gray-900'}`}>R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                    <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
                         <div className="flex flex-col"><span className="text-sm font-medium text-gray-700">{acc.name}</span><span className="text-[10px] text-gray-400 font-bold uppercase">{acc.type || 'Corrente'}</span></div>
                         <div className="text-right"><span className="text-[10px] text-gray-400 font-bold uppercase block">Projeção</span><span className={`text-xs font-bold ${acc.projectedBalance >= acc.balance ? 'text-blue-600' : 'text-orange-500'}`}>R$ {acc.projectedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                    </div>
                </div>
            </div>
          );
        })}
        {canManage && <button onClick={() => setIsModalOpen(true)} className="group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all min-h-[180px]"><div className="w-12 h-12 rounded-full bg-gray-50 group-hover:bg-blue-100 flex items-center justify-center mb-3"><svg className="w-6 h-6 text-gray-400 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div><span className="text-sm font-medium text-gray-500 group-hover:text-blue-600">Adicionar Conta</span></button>}
      </div>

      {isModalOpen && canManage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in">
                 <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">{editingId ? 'Editar Conta' : 'Nova Conta'}</h3>
                    <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 rounded-full p-1 transition-colors"><svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" /></svg></button>
                 </div>
                 <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome da Conta</label><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Nubank, Carteira..." /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Conta</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as BankAccountType})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"><option value="CHECKING">Conta Corrente / Banco</option><option value="INVESTMENT">Investimento / Corretora</option><option value="CASH">Dinheiro / Carteira</option></select></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Saldo Atual</label><div className="relative"><span className="absolute left-4 top-2.5 text-gray-500 font-medium">R$</span><input required type="number" step="0.01" value={formData.balance || ''} onChange={e => setFormData({...formData, balance: parseFloat(e.target.value) || 0})} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" /></div></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Identificação Visual</label><div className="grid grid-cols-4 gap-3">{colors.map((c) => (<button key={c.value} type="button" onClick={() => setFormData({...formData, color: c.value})} className={`relative w-full aspect-square rounded-xl flex items-center justify-center transition-all ${formData.color === c.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-105' : 'hover:scale-105'}`}><div className={`w-full h-full rounded-xl bg-gradient-to-br ${c.gradient}`}></div>{formData.color === c.value && <svg className="absolute w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</button>))}</div></div>
                        <div className="flex gap-3 pt-2"><Button type="button" variant="secondary" onClick={resetForm} className="flex-1">Cancelar</Button><Button type="submit" isLoading={isSaving} className="flex-1 shadow-lg shadow-blue-500/20">Salvar</Button></div>
                    </form>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};
