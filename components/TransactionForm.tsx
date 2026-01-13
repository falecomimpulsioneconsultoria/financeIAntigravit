
import React, { useState, useEffect } from 'react';
import { Transaction, Account, Category, TransactionType, RecurrenceType, PaymentMethod } from '../types';
import { Button } from './ui/Button';

interface TransactionFormData extends Omit<Transaction, 'id'> {
  recurrenceCount?: number;
}

interface TransactionFormProps {
  accounts: Account[];
  categories: Category[];
  paymentMethods?: PaymentMethod[];
  initialData?: Transaction | null;
  initialType?: TransactionType;
  onSubmit: (data: TransactionFormData) => void;
  onCancel: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ 
    accounts, 
    categories, 
    paymentMethods = [], 
    initialData, 
    initialType = 'EXPENSE',
    onSubmit, 
    onCancel 
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>(initialData?.type || initialType);
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [status, setStatus] = useState<'PAID' | 'PENDING'>('PAID');
  const [observation, setObservation] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<RecurrenceType>('INSTALLMENT');
  const [recurrenceCount, setRecurrenceCount] = useState(2);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description);
      setAmount(initialData.amount.toString());
      setDate(initialData.date);
      setPaymentDate(initialData.paymentDate || initialData.date);
      setType(initialData.type);
      setCategoryId(initialData.categoryId || '');
      setAccountId(initialData.accountId);
      setToAccountId(initialData.toAccountId || '');
      setPaymentMethodId(initialData.paymentMethodId || '');
      setStatus(initialData.status);
      setObservation(initialData.observation || '');
      setIsRecurring(initialData.isRecurring);
      if (initialData.recurringType) setRecurringType(initialData.recurringType);
    } else {
        setType(initialType);
    }
  }, [initialData, initialType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;
    if (!description.trim()) {
        alert("A descrição é obrigatória.");
        return;
    }
    if (type !== 'TRANSFER' && !categoryId) {
        alert("Selecione uma categoria.");
        return;
    }
    setShowSuccess(true);
    setTimeout(() => {
        onSubmit({
            description: description,
            amount: parseFloat(amount),
            date,
            paymentDate: status === 'PAID' ? paymentDate : undefined,
            type,
            categoryId: type === 'TRANSFER' ? 'transfer_internal' : categoryId,
            accountId,
            toAccountId: type === 'TRANSFER' ? toAccountId : undefined,
            paymentMethodId: paymentMethodId || undefined,
            status,
            observation,
            isRecurring,
            recurringType: isRecurring ? recurringType : undefined,
            recurrenceCount: isRecurring ? recurrenceCount : undefined,
            parentId: initialData?.parentId
        });
    }, 1200);
  };

  const filteredCategories = categories.filter(c => c.type === type);
  const parentCategories = filteredCategories.filter(c => !c.parentId);
  
  const renderCategoryOptions = () => {
    return parentCategories.map(parent => {
      const children = filteredCategories.filter(c => c.parentId === parent.id);
      return (
        <React.Fragment key={parent.id}>
          <option value={parent.id} className="font-semibold text-gray-800">{parent.name}</option>
          {children.map(child => (
             <option key={child.id} value={child.id} className="text-gray-600">&nbsp;&nbsp;&nbsp;↳ {child.name}</option>
          ))}
        </React.Fragment>
      );
    });
  };

  if (showSuccess) {
      return (
          <div className="flex flex-col items-center justify-center py-10 animate-fade-in-up">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Processado!</h3>
              <p className="text-gray-500 mt-1">Dados salvos com sucesso.</p>
          </div>
      );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {initialData?.parentId && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-3 animate-fade-in">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="text-xs text-amber-800 font-bold">Editando Baixa Parcial</p>
                <p className="text-[10px] text-amber-700 leading-tight">Ao mudar o status para <b>Pendente</b> ou alterar o valor, o saldo da conta será estornado e o lançamento principal voltará ao estado original caso necessário.</p>
              </div>
          </div>
      )}

      <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
        <button type="button" onClick={() => setType('INCOME')} disabled={!!initialData?.parentId} className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-200 ${type === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`}>Receita</button>
        <button type="button" onClick={() => setType('EXPENSE')} disabled={!!initialData?.parentId} className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-200 ${type === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`}>Despesa</button>
        <button type="button" onClick={() => setType('TRANSFER')} disabled={!!initialData?.parentId} className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-200 ${type === 'TRANSFER' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`}>Transf.</button>
      </div>

      <div className="relative">
         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 text-center">Valor do Lançamento</label>
         <div className="relative max-w-[200px] mx-auto">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-lg">R$</span>
             <input required type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className={`w-full pl-10 pr-2 py-3 text-3xl font-bold text-center bg-transparent border-b-2 outline-none transition-colors ${type === 'INCOME' ? 'text-emerald-600 border-emerald-100 focus:border-emerald-500' : 'text-rose-600 border-rose-100 focus:border-rose-500'}`}/>
         </div>
      </div>

      <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input required type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="O que foi?"/>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data / Vencimento</label>
                <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Situação</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as any)} className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-bold ${status === 'PAID' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                    <option value="PAID">Efetivado (Pago)</option>
                    <option value="PENDING">Pendente (Não Pago)</option>
                </select>
            </div>
        </div>
        
        {status === 'PAID' && (
             <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 animate-fade-in">
                <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Data do Pagamento Efetivo</label>
                <input required type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium"/>
             </div>
        )}

        <div className="grid grid-cols-2 gap-4">
            {type !== 'TRANSFER' ? (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                        <option value="">Selecione...</option>
                        {renderCategoryOptions()}
                    </select>
                </div>
            ) : (
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
                     <select required value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-blue-300 rounded-xl text-sm shadow-sm">
                        <option value="">Conta Destino...</option>
                        {accounts.filter(a => a.id !== accountId).map(a => (<option key={a.id} value={a.id}>{a.name}</option>))}
                    </select>
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conta Financeira</label>
                <select required value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                    <option value="">Selecione...</option>
                    {accounts.map(a => (<option key={a.id} value={a.id}>{a.name}</option>))}
                </select>
            </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1 text-gray-600">Cancelar</Button>
        <Button type="submit" className="flex-1 shadow-lg shadow-blue-500/30">Salvar Dados</Button>
      </div>
    </form>
  );
};
