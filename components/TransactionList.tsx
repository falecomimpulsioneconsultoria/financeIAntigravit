
import React, { useState, useMemo } from 'react';
import { Transaction, Account, Category, TransactionType, TransactionStatus } from '../types';
import { Button } from './ui/Button';

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onToggleStatus: (id: string) => void;
  onSettleTransaction: (id: string, amount: number, date: string, description: string) => void;
}

const TransactionRow: React.FC<{ 
    tx: Transaction; 
    isChild?: boolean; 
    index?: number; 
    accounts: Account[];
    categories: Category[];
    categoryCodeMap: Map<string, string>;
    childrenMap: Map<string, Transaction[]>;
    expandedParents: Set<string>;
    onToggleExpand: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (t: Transaction) => void;
    onSettle: (t: Transaction, balance: number) => void;
}> = ({ 
    tx, isChild = false, index = 0,
    accounts, categories, categoryCodeMap, childrenMap, expandedParents,
    onToggleExpand, onDelete, onEdit, onSettle
}) => {
    const account = accounts.find(a => a.id === tx.accountId);
    const category = categories.find(c => c.id === tx.categoryId);
    const catCode = category ? categoryCodeMap.get(category.id) : '';
    
    const dateObj = new Date((isChild && tx.paymentDate ? tx.paymentDate : tx.date) + 'T00:00:00');
    const day = dateObj.getDate().toString().padStart(2, '0');
    const monthShort = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
    
    const children = !isChild ? (childrenMap.get(tx.id) || []) : [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedParents.has(tx.id);
    
    // Se o pai estiver pago, o valor realizado é o total dele. 
    // Se não, é a soma dos filhos pagos.
    const totalRealized = children.reduce((sum, c) => sum + (c.status === 'PAID' ? c.amount : 0), 0);
    const isFullyPaid = tx.status === 'PAID';
    const effectiveRealized = isFullyPaid ? tx.amount : totalRealized;
    const balance = Math.max(0, tx.amount - effectiveRealized);
    
    const isOverdue = !isFullyPaid && tx.date < new Date().toISOString().split('T')[0] && !isChild;
    const isPartial = !isFullyPaid && totalRealized > 0 && !isChild;

    const formatBRL = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    const typeConfig = {
      INCOME: { label: 'Receita', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
      EXPENSE: { label: 'Despesa', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
      TRANSFER: { label: 'Transf.', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' }
    };

    const cfg = typeConfig[tx.type];

    return (
        <React.Fragment>
            <tr 
              className={`group transition-all border-b border-gray-50 cursor-pointer ${isChild ? (index % 2 === 0 ? 'bg-gray-50/40' : 'bg-white') : 'bg-white hover:bg-blue-50/10'} ${!isChild && isExpanded ? 'bg-blue-50/20' : ''}`}
              onClick={() => !isChild && onToggleExpand(tx.id)}
            >
                {/* DATA */}
                <td className="px-4 py-3 whitespace-nowrap align-middle relative w-20">
                    {isChild && (
                        <div className="absolute inset-0 w-full h-full pointer-events-none">
                            <div className="absolute left-7 top-0 bottom-1/2 w-px bg-gray-200"></div>
                            <div className="absolute left-7 top-1/2 w-3 h-px bg-gray-200"></div>
                        </div>
                    )}
                    <div className="flex items-center justify-center relative z-10">
                        {!isChild ? (
                            <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-white border border-gray-200 shadow-sm group-hover:border-blue-300 transition-colors">
                                <span className="text-[9px] font-black uppercase text-gray-400 leading-none mb-0.5">{monthShort}</span>
                                <span className="text-base font-black text-gray-800 leading-none">{day}</span>
                            </div>
                        ) : (
                            <div className="w-11 h-11 flex items-center justify-center pl-6">
                                <span className="text-[10px] text-gray-400 font-black tracking-tighter italic">{day}/{monthShort}</span>
                            </div>
                        )}
                    </div>
                </td>

                {/* NATUREZA */}
                <td className="px-4 py-3 align-middle whitespace-nowrap text-center">
                    {!isChild && (
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                            {cfg.label}
                        </span>
                    )}
                </td>

                {/* CATEGORIA */}
                <td className="px-4 py-3 align-middle whitespace-nowrap">
                    {!isChild && category ? (
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono font-bold text-gray-400 bg-gray-50 px-1 rounded border border-gray-100">{catCode}</span>
                            <span className="text-xs font-bold text-gray-600 truncate max-w-[120px]">{category.name}</span>
                        </div>
                    ) : <span className="text-gray-300 text-[10px] font-black uppercase tracking-[0.2em] pl-10 italic">{isChild ? 'Baixa' : '-'}</span>}
                </td>

                {/* DESCRIÇÃO */}
                <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2">
                        <span className={`text-sm ${isChild ? 'text-gray-400 italic font-medium' : 'text-gray-800 font-bold'} truncate max-w-[220px]`}>
                            {tx.description}
                        </span>
                        {!isChild && hasChildren && (
                            <span className={`transition-transform duration-300 p-0.5 rounded-full bg-gray-100 text-gray-400 ${isExpanded ? 'rotate-180 bg-blue-100 text-blue-600' : ''}`}>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                            </span>
                        )}
                    </div>
                </td>

                {/* CONTA */}
                <td className="px-4 py-3 align-middle whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black border bg-white text-gray-500 border-gray-100 uppercase tracking-tighter">{account?.name || '-'}</span>
                </td>

                {/* VALORES */}
                <td className="px-4 py-3 text-right align-middle whitespace-nowrap">
                    {!isChild ? <span className={`text-sm font-black ${cfg.color}`}>{formatBRL(tx.amount)}</span> : <span className="text-gray-200 text-xs font-bold">-</span>}
                </td>
                <td className="px-4 py-3 text-right align-middle whitespace-nowrap">
                    <span className="text-sm font-bold text-gray-600">
                        {isChild ? formatBRL(tx.amount) : formatBRL(effectiveRealized)}
                    </span>
                </td>
                <td className="px-4 py-3 text-right align-middle whitespace-nowrap">
                    {!isChild ? <span className={`text-sm font-black text-gray-800`}>{formatBRL(balance)}</span> : <span className="text-gray-200 text-xs font-bold">-</span>}
                </td>

                {/* STATUS */}
                <td className="px-4 py-3 align-middle text-center whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                        isFullyPaid 
                            ? 'bg-emerald-500 text-white border-emerald-600' 
                            : (isPartial 
                                ? 'bg-amber-100 text-amber-800 border-amber-200' 
                                : (isOverdue 
                                    ? 'bg-rose-600 text-white border-rose-700 animate-pulse' 
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                  )
                              )
                    }`}>
                        {isFullyPaid ? 'Quitada' : (isPartial ? 'Parcial' : (isOverdue ? 'Atrasada' : 'Pendente'))}
                    </span>
                </td>

                {/* AÇÕES */}
                <td className="px-4 py-3 text-right align-middle whitespace-nowrap min-w-[140px] relative z-20">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        {!isFullyPaid && !isChild && (
                            <button 
                                type="button"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  onSettle(tx, balance); 
                                }} 
                                className="p-2 text-emerald-600 hover:bg-emerald-600 hover:text-white bg-white border border-emerald-100 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95" 
                                title="Efetivar / Baixar"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            </button>
                        )}
                        <button 
                            type="button"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              onEdit(tx); 
                            }} 
                            className="p-2 text-blue-600 hover:bg-blue-50 bg-white border border-blue-100 rounded-xl transition-all shadow-sm hover:shadow active:scale-95" 
                            title="Editar"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button 
                            type="button"
                            onClick={(e) => { 
                              e.preventDefault();
                              e.stopPropagation(); 
                              onDelete(tx.id); 
                            }} 
                            className="p-2 text-rose-500 hover:bg-rose-600 hover:text-white bg-white border border-rose-100 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 group/del" 
                            title="Excluir"
                        >
                            <svg className="w-4 h-4 group-hover/del:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </td>
            </tr>
            {isExpanded && children.map((child, idx) => (
                <TransactionRow 
                    key={child.id} 
                    tx={child} 
                    isChild={true} 
                    index={idx} 
                    accounts={accounts}
                    categories={categories}
                    categoryCodeMap={categoryCodeMap}
                    childrenMap={childrenMap}
                    expandedParents={expandedParents}
                    onToggleExpand={onToggleExpand}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onSettle={onSettle}
                />
            ))}
        </React.Fragment>
    );
};

export const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, accounts, categories, onDelete, onEdit, onSettleTransaction
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [transactionToSettle, setTransactionToSettle] = useState<Transaction | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [settleDescription, setSettleDescription] = useState('');

  const toggleExpand = (id: string) => {
      const newSet = new Set(expandedParents);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      setExpandedParents(newSet);
  };

  const categoryCodeMap = useMemo(() => {
      const map = new Map<string, string>();
      const buildCodes = (parentId: string | undefined, prefix: string) => {
          categories.filter(c => c.parentId === parentId).forEach((c, i) => {
              const code = prefix ? `${prefix}.${i+1}` : `${i+1}`;
              map.set(c.id, code); buildCodes(c.id, code);
          });
      };
      buildCodes(undefined, ''); return map;
  }, [categories]);

  const monthRange = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start, end };
  }, [currentMonth]);

  const { roots, childrenMap, summary } = useMemo(() => {
      const allRoots = transactions.filter(t => !t.parentId);
      const allChildren = transactions.filter(t => t.parentId);
      const childrenMap = new Map<string, Transaction[]>();
      allChildren.forEach(c => {
          const list = childrenMap.get(c.parentId!) || []; list.push(c); childrenMap.set(c.parentId!, list);
      });
      const filteredRoots = allRoots.filter(t => {
        if (t.date < monthRange.start || t.date > monthRange.end) return false;
        if (searchQuery && !t.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      });
      const summary = filteredRoots.reduce((acc, t) => {
          const children = childrenMap.get(t.id) || [];
          const realized = children.reduce((sum, c) => sum + (c.status === 'PAID' ? c.amount : 0), 0);
          const actualRealized = t.status === 'PAID' ? t.amount : realized;
          const remaining = Math.max(0, t.amount - actualRealized);
          if (t.type === 'INCOME') { acc.incomeRealized += actualRealized; acc.incomePending += remaining; }
          else { acc.expenseRealized += actualRealized; acc.expensePending += remaining; }
          return acc;
      }, { incomeRealized: 0, incomePending: 0, expenseRealized: 0, expensePending: 0 });
      return { roots: filteredRoots.sort((a,b) => a.date.localeCompare(b.date)), childrenMap, summary };
  }, [transactions, monthRange, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Receitas Reais', val: summary.incomeRealized, color: 'emerald' },
            { label: 'Receitas Pend.', val: summary.incomePending, color: 'emerald', light: true },
            { label: 'Despesas Reais', val: summary.expenseRealized, color: 'rose' },
            { label: 'Despesas Pend.', val: summary.expensePending, color: 'rose', light: true },
            { label: 'Saldo Projetado', val: (summary.incomeRealized + summary.incomePending - summary.expenseRealized - summary.expensePending), color: 'blue' }
          ].map((item, i) => (
            <div key={i} className={`bg-white p-4 rounded-2xl border-l-4 shadow-sm ${item.color === 'emerald' ? 'border-l-emerald-500' : item.color === 'rose' ? 'border-l-rose-500' : 'border-l-blue-600'}`}>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
                <p className={`text-lg font-black ${item.light ? 'text-gray-500' : `text-${item.color}-700`}`}>
                    R$ {item.val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
            </div>
          ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b bg-gray-50/50 flex flex-col md:flex-row justify-between gap-4 items-center">
            <div className="flex items-center gap-3">
                <div className="flex bg-gray-200 p-1 rounded-2xl shadow-inner">
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()-1)))} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
                    <span className="text-sm font-black w-36 text-center capitalize self-center text-gray-700">{currentMonth.toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}</span>
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()+1)))} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></button>
                </div>
            </div>
            <div className="relative w-full md:w-80">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </span>
                <input type="text" placeholder="Buscar lançamentos..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm w-full focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm" />
            </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-100/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] border-b border-gray-100">
                    <tr>
                        <th className="px-4 py-4 w-20 text-center">Data</th>
                        <th className="px-4 py-4 text-center w-24">Natureza</th>
                        <th className="px-4 py-4">Categoria</th>
                        <th className="px-4 py-4">Descrição</th>
                        <th className="px-4 py-4">Conta</th>
                        <th className="px-4 py-4 text-right">Previsto</th>
                        <th className="px-4 py-4 text-right">Efetivado</th>
                        <th className="px-4 py-4 text-right">Saldo</th>
                        <th className="px-4 py-4 text-center">Status</th>
                        <th className="px-4 py-4 text-right w-36">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {roots.length === 0 ? (
                        <tr><td colSpan={10} className="text-center py-32 text-gray-400 font-medium italic">Nenhum lançamento no período.</td></tr>
                    ) : roots.map(r => (
                        <TransactionRow 
                            key={r.id} 
                            tx={r} 
                            accounts={accounts} 
                            categories={categories} 
                            categoryCodeMap={categoryCodeMap} 
                            childrenMap={childrenMap} 
                            expandedParents={expandedParents} 
                            onToggleExpand={toggleExpand} 
                            onDelete={onDelete} 
                            onEdit={onEdit} 
                            onSettle={(t,b) => { 
                                setTransactionToSettle(t); 
                                setSettleAmount(b.toFixed(2)); 
                                setSettleDescription(`Baixa: ${t.description}`); 
                                setSettleDate(new Date().toISOString().split('T')[0]);
                                setSettleModalOpen(true); 
                            }} 
                        />
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {settleModalOpen && transactionToSettle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-scale-in">
                  <h3 className="text-xl font-black text-gray-800 mb-2">Confirmar Efetivação</h3>
                  <p className="text-xs text-gray-500 mb-6 uppercase tracking-widest font-bold">Registro de movimento de caixa</p>
                  
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      onSettleTransaction(transactionToSettle.id, parseFloat(settleAmount), settleDate, settleDescription);
                      setSettleModalOpen(false);
                      // Auto expandir para mostrar o resultado
                      setExpandedParents(new Set([...expandedParents, transactionToSettle.id]));
                  }} className="space-y-4">
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Descrição do Pagamento</label>
                          <input type="text" required value={settleDescription} onChange={e => setSettleDescription(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-gray-700 shadow-inner" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Data Efetiva</label>
                              <input type="date" required value={settleDate} onChange={e => setSettleDate(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none text-xs font-black shadow-inner" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Valor Pago</label>
                              <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">R$</span>
                                  <input type="number" step="0.01" required value={settleAmount} onChange={e => setSettleAmount(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none font-black text-gray-700 shadow-inner" />
                              </div>
                          </div>
                      </div>
                      
                      <div className="pt-6 flex gap-3">
                          <button type="button" onClick={() => setSettleModalOpen(false)} className="flex-1 py-4 text-sm font-black text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest">Cancelar</button>
                          <button type="submit" className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-500/20 text-sm font-black transition-all uppercase tracking-widest">Confirmar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
