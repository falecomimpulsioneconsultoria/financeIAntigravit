
import React, { useState, useMemo } from 'react';
import { FinancialSummary, Transaction, Account, Category, User } from '../types';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Cell } from 'recharts';

interface DashboardV2Props {
  summary: FinancialSummary;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  user: User;
  onTransactionClick: (transaction: Transaction) => void;
  onOpenNewTransaction: (type?: 'INCOME' | 'EXPENSE' | 'TRANSFER') => void;
  onNavigateToTransactions: (startDate: string, endDate: string, highlightId?: string) => void;
}

export const DashboardV2: React.FC<DashboardV2Props> = ({ summary, transactions, accounts, categories, user, onTransactionClick, onOpenNewTransaction, onNavigateToTransactions }) => {
  // State for Date Filter
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // State for Widgets
  const [top15Filter, setTop15Filter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const [showValues, setShowValues] = useState<boolean>(true); // Privacy Toggle State
  
  // Calculate Start/End dates based on selection
  const { startDate, endDate } = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
    const end = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
    return { startDate: start, endDate: end };
  }, [selectedMonth, selectedYear]);

  // --- DATA COMPUTATION (Duplicated logic from Dashboard V1 mostly, but adapted for specific widgets) ---
  
  // Saldo Total
  const totalBalance = useMemo(() => accounts.reduce((acc, a) => acc + a.balance, 0), [accounts]);

  // Top 15 Analysis
  const topTransactions = useMemo(() => {
     return transactions
      .filter(t => {
          if (t.status !== 'PAID') return false;
          if (t.date < startDate || t.date > endDate) return false;
          if (top15Filter !== 'ALL' && t.type !== top15Filter) return false;
          return true;
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 15);
  }, [transactions, startDate, endDate, top15Filter]);

  // Today's summary
  const todayStr = new Date().toISOString().split('T')[0];
  const { toReceiveToday, toPayToday, overdueReceivables, overduePayables } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    let receive = 0;
    let pay = 0;
    let overdueRec = 0;
    let overduePay = 0;

    transactions.forEach(t => {
       if (t.status === 'PENDING') {
         if (t.date === today) {
           if (t.type === 'INCOME') receive += t.amount;
           if (t.type === 'EXPENSE') pay += t.amount;
         }
         if (t.date < today) {
            if (t.type === 'INCOME') overdueRec += t.amount;
            if (t.type === 'EXPENSE') overduePay += t.amount;
         }
       }
    });

    return { 
      toReceiveToday: receive, 
      toPayToday: pay,
      overdueReceivables: overdueRec,
      overduePayables: overduePay 
    };
  }, [transactions]);

  // Calculates Partial Defaults (Quanto falta pagar/receber de parciais)
  const { partialIncomeRemaining, partialExpenseRemaining } = useMemo(() => {
        let inc = 0;
        let exp = 0;
        
        // Map children first
        const childrenMap = new Map<string, Transaction[]>();
        transactions.filter(t => t.parentId).forEach(t => {
            const list = childrenMap.get(t.parentId!) || [];
            list.push(t);
            childrenMap.set(t.parentId!, list);
        });

        // Itera parents
        transactions.filter(t => !t.parentId && t.status !== 'PAID').forEach(t => {
            const children = childrenMap.get(t.id) || [];
            if (children.length > 0) {
                const totalPaid = children.reduce((sum, c) => sum + (c.status === 'PAID' ? c.amount : 0), 0);
                const remaining = Math.max(0, t.amount - totalPaid);
                
                if (remaining > 0) {
                    if (t.type === 'INCOME') inc += remaining;
                    if (t.type === 'EXPENSE') exp += remaining;
                }
            }
        });

        return { partialIncomeRemaining: inc, partialExpenseRemaining: exp };
  }, [transactions]);

  // Chart Data (Fluxo de Caixa)
  const chartData = useMemo(() => {
    // 1. Map children to handle partials
    const childrenMap = new Map<string, Transaction[]>();
    transactions.filter(t => t.parentId).forEach(t => {
        const list = childrenMap.get(t.parentId!) || [];
        list.push(t);
        childrenMap.set(t.parentId!, list);
    });

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const data = [];
    let currentAccumulated = totalBalance; // Start with current total balance? 
    // Ideally, for a "Period" view, usually it starts with the Balance at the beginning of the period.
    // For simplicity/robustness without full historical query:
    // We can compute the running "flow" for the month. Or try to backtrack from current balance.
    // Let's rely on "flow" for the bars, and "accumulated flow" + "initial balance" for the line.
    
    // BACKTRACKING INITIAL BALANCE:
    // Current Balance - (Sum of all future transactions relative to start of month) ? No.
    // Let's just track the "Monthly Variation" for the line, starting at 0? 
    // Or simpler: The image shows "Saldo Acumulado".
    // Let's assume the user wants to see the evolution of the balance *during* the month.
    // Algorithm: 
    // 1. Get current total balance.
    // 2. Subtract all future transactions (after today).
    // 3. Subtract transactions from today.
    // 4. Subtract transactions from previous days of this month.
    // -> This gives Balance at Start of Month.
    // THEN simulate forward.
    
    // Simplified Approach for Speed: Just Cumulative Flow relative to 0 (or Month Start).
    // Let's try to estimate Month Start. (This is tricky without a proper backend or full history).
    // We will accumulate just the flow of the month.
    
    let accumulated = 0; // Relative to month start

    for (let i = 1; i <= daysInMonth; i++) {
       const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
       
       let dailyIncome = 0;
       let dailyExpense = 0;

       transactions.forEach(t => {
           const isChild = !!t.parentId;
           const children = childrenMap.get(t.id) || [];
           const hasChildren = children.length > 0;

           if (isChild) {
               if (t.date === dateKey) {
                   if (t.type === 'INCOME') dailyIncome += t.amount;
                   else dailyExpense += t.amount;
               }
               return;
           }

           if (hasChildren) {
               if (t.date === dateKey) {
                   const totalPaidChildren = children.reduce((s, c) => s + (c.status === 'PAID' ? c.amount : 0), 0);
                   const remaining = Math.max(0, t.amount - totalPaidChildren);
                   if (t.status === 'PENDING') {
                       if (t.type === 'INCOME') dailyIncome += remaining;
                       else dailyExpense += remaining;
                   }
               }
               return;
           }

           if (t.date === dateKey) {
               if (t.status === 'PENDING' || t.status === 'PAID') {
                   if (t.type === 'INCOME') dailyIncome += t.amount;
                   else dailyExpense += t.amount;
               }
           }
       });
       
        const net = dailyIncome - dailyExpense;
        accumulated += net;
 
        data.push({
          day: i,
          Receitas: dailyIncome,
          Despesas: dailyExpense,
          Net: net,
          Accumulated: accumulated 
        });
    }
    return data;
  }, [transactions, selectedMonth, selectedYear]);


  return (
    <div className="flex flex-col h-full bg-gray-100 p-4 gap-4 overflow-y-auto custom-scrollbar">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <button 
          onClick={() => onOpenNewTransaction('EXPENSE')}
          className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg shadow-md flex items-center gap-2 transition-all active:scale-95"
        >
          <span>Cadastrar Novo</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>

        <div className="flex items-center bg-white p-1.5 rounded-lg shadow-sm border border-gray-200 gap-2">
            <span className="text-sm font-bold text-gray-600 px-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Alterar data da Dashboard
            </span>
            <div className="flex border border-cyan-400 rounded overflow-hidden">
                <button className="px-3 py-1 bg-white text-cyan-600 font-bold hover:bg-cyan-50 text-xs uppercase transition-colors">Mês</button>
                <button className="px-3 py-1 bg-white text-gray-400 font-bold hover:bg-gray-50 text-xs uppercase transition-colors border-l border-gray-100">Ano</button>
            </div>
             
             {/* Simple Selectors */}
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-sm font-bold text-cyan-600 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
            >
              {Array.from({length: 12}, (_, i) => new Date(0, i).toLocaleString('pt-BR', {month: 'long'})).map((m, i) => (
                  <option key={i} value={i} className="capitalize">{m}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-sm font-bold text-cyan-600 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
            >
               <option value={2024}>2024</option>
               <option value={2025}>2025</option>
               <option value={2026}>2026</option>
            </select>
        </div>
      </div>

      {/* MAIN GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN - TOP 15 */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm p-4 border border-gray-200 flex flex-col h-[600px]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-700">Top 15</h3>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                     <button 
                        onClick={() => setTop15Filter(prev => prev === 'INCOME' ? 'ALL' : 'INCOME')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${top15Filter === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                     >
                        Receitas
                     </button>
                     <button 
                        onClick={() => setTop15Filter(prev => prev === 'EXPENSE' ? 'ALL' : 'EXPENSE')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${top15Filter === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                     >
                        Despesas
                     </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Mock Item */}
                {topTransactions.length === 0 ? <p className="text-xs text-gray-400 text-center py-10">Nenhum dado no período</p> : topTransactions.map((t, idx) => (
                     <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase">
                            <span className="truncate max-w-[150px]">{((t.amount / Math.max(1, summary.totalIncome + summary.totalExpense)) * 100).toFixed(1)}% | {t.description}</span>
                            <span className={t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}>R$ {t.amount.toLocaleString()}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${t.type === 'INCOME' ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ width: `${Math.min(100, (t.amount / (topTransactions[0]?.amount || 1)) * 100)}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4 pt-2 border-t border-gray-100 text-[10px] text-gray-400 text-center">
                Ref: {top15Filter === 'ALL' ? 'Geral' : (top15Filter === 'INCOME' ? 'Receitas' : 'Despesas')}
            </div>
        </div>

        {/* MIDDLE COLUMN - BALANCES & CALENDAR */}
        <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* SALDO TOTAL */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="text-gray-500 font-medium text-sm">Saldo Total Atualizado</h3>
                    <button onClick={() => setShowValues(!showValues)} className="text-gray-400 hover:text-cyan-600 transition-colors">
                        {showValues ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        )}
                    </button>
                </div>
                <div className="mb-2">
                    <span className="text-2xl font-bold text-gray-800">
                        {showValues ? `R$ ${summary.totalBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'R$ ••••••'}
                    </span>
                </div>
                <div className="text-xs text-blue-500 font-medium mb-4">
                    Saldo em {new Date().toLocaleDateString()}: <span className="font-bold">
                        {showValues ? `R$ ${(summary.totalBalance * 0.9).toLocaleString('pt-BR')}` : 'R$ ••••••'}
                    </span>
                </div>

            </div>



            {/* CALENDARIO DE LANÇAMENTOS */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="p-3 bg-gray-50 border-b border-gray-100 text-center">
                    <h3 className="text-sm font-bold text-gray-700">Calendário de Lançamentos</h3>
                    <p className="text-xs text-gray-400 uppercase">{new Date(selectedYear, selectedMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                </div>
                
                {/* Mini Calendar Grid Placeholder */}
                <div className="p-4 grid grid-cols-7 gap-1 text-center">
                    {['D','S','T','Q','Q','S','S'].map((d, i) => <span key={i} className="text-[10px] font-bold text-gray-400 mb-2">{d}</span>)}
                    {/* Real Days Logic */}
                    {(() => {
                        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                        const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
                        const days = [];
                        for(let i=0; i<firstDay; i++) days.push(<div key={`empty-${i}`} />);
                        
                        for(let i=1; i<=daysInMonth; i++) {
                            const dateStr = `${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
                            const hasEvents = transactions.some(t => t.date === dateStr && t.status === 'PENDING'); // Simple check
                            
                            days.push(
                                <button 
                                    key={i} 
                                    onClick={() => setSelectedCalendarDay(i)}
                                    className={`h-7 w-7 mx-auto flex items-center justify-center text-xs rounded-full transition-all relative
                                        ${selectedCalendarDay === i 
                                            ? 'bg-cyan-600 text-white font-bold shadow-md scale-110' 
                                            : (hasEvents ? 'text-cyan-600 font-bold hover:bg-cyan-50' : 'text-gray-500 hover:bg-gray-100')}
                                    `}
                                >
                                    {i}
                                    {hasEvents && selectedCalendarDay !== i && <div className="absolute -bottom-0.5 w-1 h-1 bg-cyan-400 rounded-full"></div>}
                                </button>
                            );
                        }
                        return days;
                    })()}
                </div>

                <div className="p-3 border-t border-gray-100">
                     <div className="text-[10px] text-gray-400 text-center mt-1">
                        {selectedCalendarDay ? `Dia ${selectedCalendarDay} selecionado` : 'Selecione um dia'}
                     </div>
                </div>

                <button 
                    onClick={() => {
                        if (selectedCalendarDay) {
                            const dateStr = `${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}-${String(selectedCalendarDay).padStart(2,'0')}`;
                            onNavigateToTransactions(dateStr, dateStr);
                        } else {
                            onNavigateToTransactions(startDate, endDate);
                        }
                    }}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 text-xs uppercase transition-colors"
                >
                    Ver Todos Lançamentos
                </button>
            </div>
            
            {/* LISTA DO DIA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col h-[200px]">
                 <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 text-center border-b border-gray-100">
                     Lançamentos do dia {selectedCalendarDay ? `${selectedCalendarDay}/${selectedMonth+1}` : ''}
                 </div>
                 <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                     {selectedCalendarDay ? (
                         (() => {
                             const dateStr = `${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}-${String(selectedCalendarDay).padStart(2,'0')}`;
                             const dayTransactions = transactions.filter(t => t.date === dateStr);
                             
                             if (dayTransactions.length === 0) return <div className="h-full flex items-center justify-center text-xs text-gray-400">Nada agendado</div>;
                             
                             return dayTransactions.map(t => (
                                 <div 
                                     key={t.id} 
                                     onClick={() => onNavigateToTransactions(dateStr, dateStr, t.id)}
                                     className="flex justify-between items-center p-2 rounded border border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                                 >
                                     <div className="flex flex-col min-w-0">
                                         <span className="text-[10px] font-bold text-gray-700 truncate">{t.description}</span>
                                         <span className="text-[9px] text-gray-400">{categories.find(c => c.id === t.categoryId)?.name}</span>
                                     </div>
                                     <span className={`text-[10px] font-bold whitespace-nowrap ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                         {t.type === 'EXPENSE' ? '-' : '+'} {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                     </span>
                                 </div>
                             ));
                         })()
                     ) : (
                         <div className="h-full flex items-center justify-center text-xs text-gray-400">Clique em um dia no calendário</div>
                     )}
                 </div>
            </div>

        </div>

        {/* RIGHT COLUMN - ACTIONS & CHARTS */}
        <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* TOP ROW CARDS */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-cyan-500 rounded-xl shadow-md p-4 text-white relative overflow-hidden group">
                     <div className="relative z-10">
                        <p className="font-bold text-sm opacity-90">A Receber Hoje</p>
                        <p className="text-2xl font-bold mt-1">R$ {toReceiveToday.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                        <p className="text-[10px] opacity-75 mt-1">Restante do mês: R$ {summary.pendingIncome.toLocaleString('pt-BR')}</p>
                        
                        <div className="flex items-center justify-between mt-4">
                             <button onClick={() => onOpenNewTransaction('INCOME')} className="bg-white text-cyan-600 text-[10px] font-bold px-3 py-1.5 rounded shadow-sm hover:bg-gray-50 transition-colors uppercase">
                                 Novo Recebimento
                             </button>
                             <button className="text-[10px] hover:underline opacity-90">Ver todos</button>
                        </div>
                     </div>
                </div>

                 <div className="bg-cyan-500 rounded-xl shadow-md p-4 text-white relative overflow-hidden group">
                     <div className="relative z-10">
                        <p className="font-bold text-sm opacity-90">A Pagar Hoje</p>
                        <p className="text-2xl font-bold mt-1">R$ {toPayToday.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                        <p className="text-[10px] opacity-75 mt-1">Restante do mês: R$ {summary.pendingExpense.toLocaleString('pt-BR')}</p>
                        
                        <div className="flex items-center justify-between mt-4">
                             <button onClick={() => onOpenNewTransaction('EXPENSE')} className="bg-white text-cyan-600 text-[10px] font-bold px-3 py-1.5 rounded shadow-sm hover:bg-gray-50 transition-colors uppercase">
                                 Novo Pagamento
                             </button>
                             <button className="text-[10px] hover:underline opacity-90">Ver todos</button>
                        </div>
                     </div>
                </div>
            </div>

            {/* SECOND ROW CARDS (ALERTS) */}
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-gray-500">Recebimentos em Atraso</p>
                        <p className={`text-lg font-bold ${overdueReceivables > 0 ? 'text-red-500' : 'text-blue-500'}`}>R$ {overdueReceivables.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                        <p className="text-[8px] text-gray-400">Atualizado em {new Date().toLocaleTimeString()}</p>
                     </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-500 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-gray-500">Pagamentos em Atraso</p>
                        <p className={`text-lg font-bold ${overduePayables > 0 ? 'text-red-500' : 'text-cyan-500'}`}>R$ {overduePayables.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                        <p className="text-[8px] text-gray-400">Atualizado em {new Date().toLocaleTimeString()}</p>
                     </div>
                </div>
            </div>

            {/* PARTIALS CARDS */}
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 flex items-center gap-3 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-2 opacity-5">
                        <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     </div>
                     <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 z-10">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     </div>
                     <div className="z-10">
                        <p className="text-[10px] font-bold text-gray-500">Restante Receb. Parcial</p>
                        <p className="text-lg font-bold text-emerald-600">R$ {partialIncomeRemaining.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                     </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 flex items-center gap-3 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-2 opacity-5">
                        <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     </div>
                     <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shrink-0 z-10">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     </div>
                     <div className="z-10">
                        <p className="text-[10px] font-bold text-gray-500">Restante Pagto Parcial</p>
                        <p className="text-lg font-bold text-rose-600">R$ {partialExpenseRemaining.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                     </div>
                </div>
            </div>

            {/* FLUXO DE CAIXA CHART */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[500px] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-50 bg-white">
                    <h3 className="font-bold text-gray-800 text-sm">Fluxo de Caixa</h3>
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                         <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-600">
                             Visualização: <span className="text-cyan-600 font-bold">📊</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span>Previsto</span>
                             <div className="w-8 h-4 bg-gray-200 rounded-full relative cursor-pointer">
                                 <div className="w-4 h-4 bg-white rounded-full shadow absolute right-0"></div>
                             </div>
                             <span className="text-gray-900 font-bold">Realizado</span>
                         </div>
                    </div>
                </div>
                
                {/* Chart Area */}
                <div className="flex-1 w-full min-h-0 bg-gray-50/20 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={chartData} margin={{top: 20, right: 30, left: 0, bottom: 20}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                             <XAxis 
                                dataKey="day" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 10, fill: '#6b7280'}} 
                                interval={0}
                             />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 10, fill: '#6b7280'}} 
                                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value} 
                            />
                            <Tooltip 
                                formatter={(value: number, name: string) => [
                                    `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
                                    name === 'Accumulated' ? 'Saldo Acumulado' : (name === 'Net' ? 'Saldo do Dia' : name)
                                ]}
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                            />
                            <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                            
                            <Bar dataKey="Net" barSize={12} radius={[2, 2, 2, 2]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.Net >= 0 ? '#06b6d4' : '#0284c7'} />
                                ))}
                            </Bar>

                            <Line 
                                type="monotone" 
                                dataKey="Accumulated" 
                                stroke="#f59e0b" 
                                strokeWidth={2}
                                dot={{r: 4, fill: 'white', stroke: '#f59e0b', strokeWidth: 2}}
                                activeDot={{r: 6}}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                
                {/* Legend */}
                <div className="flex justify-center gap-6 pb-4 text-[10px] uppercase font-bold text-gray-500 bg-white">
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Recebimentos</div>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Pagamentos</div>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-600 border border-white shadow-sm ring-1 ring-sky-600"></span> Saldo Acumulado no Período</div>
                </div>

                {/* Footer Strip */}
                <div className="bg-cyan-50 border-t border-cyan-100 p-4 flex justify-between items-center">
                    <div className="flex gap-8">
                        <div>
                            <p className="text-[10px] font-bold text-cyan-600 uppercase mb-0.5">Receitas</p>
                            <p className="text-sm font-bold text-gray-700">R$ {summary.totalIncome.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-cyan-600 uppercase mb-0.5">Despesas</p>
                            <p className="text-sm font-bold text-gray-700">R$ {summary.totalExpense.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                        </div>
                    </div>
                    <div>
                         <p className="text-[10px] font-bold text-gray-700 uppercase mb-0.5">Saldo</p>
                         <p className={`text-xl font-bold ${summary.totalBalance >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
                             R$ {summary.totalBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                         </p>
                    </div>
                </div>

            </div>

        </div>

      </div>





    </div>
  );
};
