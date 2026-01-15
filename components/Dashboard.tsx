
import React, { useState, useMemo } from 'react';
import { FinancialSummary, Transaction, Account, Category, User, AIAnalysisResult, TransactionType } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { analyzeFinances } from '../services/geminiService';
import { MonthSelector } from './ui/MonthSelector';
import { AIAnalysisCard } from './AIAnalysisCard';
import { Button } from './ui/Button';

interface DashboardProps {
  summary: FinancialSummary;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  user: User;
  onTransactionClick: (transaction: Transaction) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ summary, transactions, accounts, categories, user, onTransactionClick }) => {
  // Estados de data (inicializando com o mês atual)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const handleMonthChange = (newDate: Date) => {
    const start = new Date(newDate.getFullYear(), newDate.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(start);
    setEndDate(end);
    setCalendarMonth(newDate);
    setSelectedCalendarDates([]);
  };

  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // States for "Agenda Financeira" (Upcoming)
  const [upcomingFilter, setUpcomingFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDates, setSelectedCalendarDates] = useState<string[]>([]);

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    setAiResult(null);
    const result = await analyzeFinances(transactions, accounts, categories, user.accountType);
    setAiResult(result);
    setIsAnalyzing(false);
  };

  // --- DATA PREPARATION ---

  // 1. Chart Data (Fluxo de Caixa)
  const chartData = useMemo(() => {
    const today = new Date();
    const data = [];
    const rootTransactions = transactions.filter(t => !t.parentId);

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7);
      const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

      const income = rootTransactions
        .filter(t => t.date.startsWith(monthKey) && t.type === 'INCOME')
        .reduce((acc, t) => acc + t.amount, 0);

      const expense = rootTransactions
        .filter(t => t.date.startsWith(monthKey) && t.type === 'EXPENSE')
        .reduce((acc, t) => acc + t.amount, 0);

      data.push({ name: monthLabel, Receita: income, Despesa: expense });
    }
    return data;
  }, [transactions]);

  // 2. Upcoming/Pending Data (Base para o período/mês)
  const allPendingTransactions = useMemo(() => {
    let filtered = transactions.filter(t =>
      !t.parentId &&
      t.status === 'PENDING' &&
      (upcomingFilter === 'ALL' || t.type === upcomingFilter) &&
      t.date >= startDate && t.date <= endDate
    );
    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, upcomingFilter, startDate, endDate]);

  // 3. Data para exibição na lista (pode ser filtrada por clique no calendário)
  const displayTransactions = useMemo(() => {
    if (selectedCalendarDates.length === 0) return allPendingTransactions;
    return allPendingTransactions.filter(t => selectedCalendarDates.includes(t.date));
  }, [allPendingTransactions, selectedCalendarDates]);

  // 4. Calendar Grid Generation
  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay();
    const grid = [];
    for (let i = 0; i < startDayOfWeek; i++) grid.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayItems = allPendingTransactions.filter(t => t.date === dateStr);
      grid.push({ day: i, dateStr, items: dayItems });
    }
    return grid;
  }, [calendarMonth, allPendingTransactions]);

  // 4. Local Financial Summary (Calculated based on filtered date)
  const financialSummary = useMemo(() => {
    const rootTransactions = transactions.filter(t => !t.parentId);

    // Transações Realizadas dentro do período
    const incomeRealized = transactions
      .filter(t => t.type === 'INCOME' && t.status === 'PAID' && (t.paymentDate || t.date) >= startDate && (t.paymentDate || t.date) <= endDate)
      .reduce((acc, t) => acc + t.amount, 0);

    const expenseRealized = transactions
      .filter(t => t.type === 'EXPENSE' && t.status === 'PAID' && (t.paymentDate || t.date) >= startDate && (t.paymentDate || t.date) <= endDate)
      .reduce((acc, t) => acc + t.amount, 0);

    // Transações Pendentes dentro do período (considerando saldo restante)
    const incomePending = rootTransactions
      .filter(t => t.type === 'INCOME' && t.status === 'PENDING' && t.date >= startDate && t.date <= endDate)
      .reduce((acc, t) => {
        const paid = transactions.filter(c => c.parentId === t.id && c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0);
        return acc + Math.max(0, t.amount - paid);
      }, 0);

    const expensePending = rootTransactions
      .filter(t => t.type === 'EXPENSE' && t.status === 'PENDING' && t.date >= startDate && t.date <= endDate)
      .reduce((acc, t) => {
        const paid = transactions.filter(c => c.parentId === t.id && c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0);
        return acc + Math.max(0, t.amount - paid);
      }, 0);

    return {
      totalBalance: accounts.reduce((acc, a) => acc + a.balance, 0),
      totalIncome: incomeRealized,
      totalExpense: expenseRealized,
      pendingIncome: incomePending,
      pendingExpense: expensePending
    };
  }, [transactions, accounts, startDate, endDate]);

  const handleCalendarNav = (offset: number) => {
    const newDate = new Date(calendarMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCalendarMonth(newDate);
    setSelectedCalendarDates([]); // Limpar filtro ao trocar mês do calendário
  };

  const handleDateClick = (dateStr: string, isCtrlKey: boolean) => {
    setSelectedCalendarDates(prev => {
      if (isCtrlKey) {
        // Seleção múltipla
        if (prev.includes(dateStr)) {
          return prev.filter(d => d !== dateStr);
        } else {
          return [...prev, dateStr];
        }
      } else {
        // Seleção única (comportamento padrão)
        return prev.includes(dateStr) && prev.length === 1 ? [] : [dateStr];
      }
    });
  };

  const resultOfMonth = (financialSummary.totalIncome + financialSummary.pendingIncome) - (financialSummary.totalExpense + financialSummary.pendingExpense);
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-600 animate-fade-in-up delay-75">
          <p className="text-xs md:text-xs text-gray-500 font-bold uppercase tracking-wider">Receitas Realizadas</p>
          <p className="text-lg md:text-xl font-bold mt-1 text-emerald-700 truncate">
            R$ {financialSummary.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-400 animate-fade-in-up delay-100">
          <p className="text-xs md:text-xs text-gray-500 font-bold uppercase tracking-wider">Receitas Pendentes</p>
          <p className="text-lg md:text-xl font-bold mt-1 text-emerald-500 truncate">
            R$ {financialSummary.pendingIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-rose-600 animate-fade-in-up delay-150">
          <p className="text-xs md:text-xs text-gray-500 font-bold uppercase tracking-wider">Despesas Realizadas</p>
          <p className="text-lg md:text-xl font-bold mt-1 text-rose-700 truncate">
            R$ {financialSummary.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-orange-400 animate-fade-in-up delay-200">
          <p className="text-xs md:text-xs text-gray-500 font-bold uppercase tracking-wider">Despesas Pendentes</p>
          <p className="text-lg md:text-xl font-bold mt-1 text-orange-600 truncate">
            R$ {financialSummary.pendingExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 ${resultOfMonth >= 0 ? 'border-l-blue-500' : 'border-l-red-500'} animate-fade-in-up delay-300`}>
          <p className="text-xs md:text-xs text-gray-500 font-bold uppercase tracking-wider">Resultado do Mês</p>
          <p className={`text-lg md:text-xl font-bold mt-1 truncate ${resultOfMonth >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
            R$ {resultOfMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up delay-300">
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Agenda Financeira
            <span className="text-xs font-normal text-gray-500 ml-2 bg-white px-2 py-0.5 rounded border border-gray-200">
              {allPendingTransactions.length} pendentes
            </span>
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
            <MonthSelector
              selectedDate={new Date(startDate + 'T00:00:00')}
              onChange={handleMonthChange}
            />
            <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none p-0 text-xs font-bold text-gray-600 outline-none focus:ring-0"
              />
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none p-0 text-xs font-bold text-gray-600 outline-none focus:ring-0"
              />
            </div>
            <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>
            <select
              value={upcomingFilter}
              onChange={(e) => setUpcomingFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
            >
              <option value="ALL">Todas</option>
              <option value="INCOME">Receitas (Entradas)</option>
              <option value="EXPENSE">Despesas (Saídas)</option>
              <option value="TRANSFER">Transferências (Entre Contas)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:divide-x divide-gray-100">
          {/* LISTA */}
          <div className="lg:col-span-5 flex flex-col h-[500px]">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {selectedCalendarDates.length > 0 ? (
                  <span className="flex items-center gap-2">
                    {selectedCalendarDates.length === 1
                      ? `Lançamentos de ${new Date(selectedCalendarDates[0] + 'T00:00:00').toLocaleDateString('pt-BR')}`
                      : `${selectedCalendarDates.length} dias selecionados`
                    }
                    <button
                      onClick={() => setSelectedCalendarDates([])}
                      className="ml-2 text-blue-600 hover:text-blue-800 text-[10px] font-bold underline"
                    >
                      Limpar
                    </button>
                  </span>
                ) : (
                  'Próximos Lançamentos'
                )}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {displayTransactions.length === 0 ? (
                <div className="text-center py-12 text-gray-400 flex flex-col items-center justify-center h-full">
                  <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <p className="text-sm">Nenhuma conta pendente encontrada.</p>
                </div>
              ) : (
                displayTransactions.map(t => {
                  const dateObj = new Date(t.date + 'T00:00:00');
                  const isIncome = t.type === 'INCOME';
                  const isExpense = t.type === 'EXPENSE';
                  const isOverdue = t.date < todayStr;
                  const isToday = t.date === todayStr;
                  let statusLabel = isOverdue ? 'Atrasado' : (isToday ? 'Vence Hoje' : 'Em dia');
                  let statusColor = isOverdue ? 'bg-red-100 text-red-700' : (isToday ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700');

                  const typeColorClass = isIncome ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : (isExpense ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-blue-600 bg-blue-50 border-blue-100');
                  const amountColorClass = isIncome ? 'text-emerald-700' : (isExpense ? 'text-rose-700' : 'text-blue-700');

                  return (
                    <div
                      key={t.id}
                      onClick={() => onTransactionClick(t)}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-all border border-gray-100 group shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg border ${typeColorClass} shrink-0`}>
                          <span className="text-[9px] font-bold uppercase leading-none mb-0.5">{dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                          <span className="text-base font-bold leading-none">{dateObj.getDate()}</span>
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-gray-800 truncate text-sm block">{t.description}</span>
                            {isOverdue && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse"></span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusColor}`}>
                              {statusLabel}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate max-w-[80px]">
                              {categories.find(c => c.id === t.categoryId)?.name || 'Geral'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right pl-2 shrink-0">
                        <span className={`block font-bold text-sm ${amountColorClass}`}>
                          {isExpense ? '- ' : '+ '}
                          R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        {t.accountId && (
                          <span className="text-[9px] text-gray-400 px-1 rounded border border-gray-100 inline-block mt-0.5">
                            {accounts.find(a => a.id === t.accountId)?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CALENDAR */}
          <div className="lg:col-span-7 p-4 bg-white md:p-6">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => handleCalendarNav(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h4 className="text-lg font-bold text-gray-800 capitalize flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h4>
              <button onClick={() => handleCalendarNav(1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                <div key={i} className={`text-center text-xs font-bold py-1 ${i === 0 || i === 6 ? 'text-red-400' : 'text-gray-400'}`}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {calendarGrid.map((cell, idx) => {
                if (!cell) return <div key={`empty-${idx}`} className="h-20 md:h-24 rounded-xl bg-gray-50/50 border border-transparent" />;

                const hasItems = cell.items.length > 0;
                const totalDayIncome = cell.items.filter(i => i.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
                const totalDayExpense = cell.items.filter(i => i.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
                const balance = totalDayIncome - totalDayExpense;
                const isToday = cell.dateStr === todayStr;

                const isSelected = selectedCalendarDates.includes(cell.dateStr);

                return (
                  <div
                    key={cell.dateStr}
                    onClick={(e) => handleDateClick(cell.dateStr, e.ctrlKey || e.metaKey)}
                    className={`h-20 md:h-24 rounded-xl border p-1 md:p-2 flex flex-col justify-between transition-all relative overflow-hidden group hover:border-blue-200 hover:shadow-md cursor-pointer ${isToday ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-100'} ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 shadow-md scale-[1.02] z-10' : ''}`}
                  >
                    {isToday && <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-bl-lg"></div>}

                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 bg-gray-50'}`}>
                        {cell.day}
                      </span>
                      {hasItems && (
                        <div className="flex gap-0.5">
                          {totalDayIncome > 0 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>}
                          {totalDayExpense > 0 && <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5 mt-1 overflow-hidden">
                      {cell.items.slice(0, 2).map((item, i) => (
                        <div key={i} className={`flex justify-between items-center px-1 py-0.5 rounded border text-[8px] font-medium leading-tight ${item.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                          <span className="truncate max-w-[60%]">{item.description}</span>
                          <span className="font-bold shrink-0">R${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                        </div>
                      ))}
                      {cell.items.length > 2 && (
                        <div className="text-[8px] text-gray-400 font-medium text-center bg-gray-50/50 rounded py-0.5">
                          +{cell.items.length - 2}
                        </div>
                      )}
                    </div>

                    {hasItems && (
                      <div className="mt-1 pt-1 border-t border-gray-50 flex justify-end">
                        <span className={`text-[9px] font-black ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {balance >= 0 ? '+' : ''}R${balance.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                    )}

                    {/* Tooltip on Hover */}
                    <div className="hidden group-hover:block absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-48 bg-gray-900/90 backdrop-blur text-white text-[10px] p-2 rounded-lg shadow-xl pointer-events-none">
                      <p className="font-bold border-b border-gray-700 pb-1 mb-1 text-gray-300">{new Date(cell.dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                      {cell.items.map((item, i) => (
                        <div key={i} className="flex justify-between mb-0.5">
                          <span className="text-gray-300 truncate max-w-[70%]">{item.description}</span>
                          <span className={item.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}>
                            {item.type === 'EXPENSE' ? '-' : '+'}R${item.amount.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-gray-700 pt-1 mt-1 flex justify-between font-bold">
                        <span>Total:</span>
                        <span className={balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-fade-in-up delay-500">
        <div className="flex justify-between items-center mb-4 px-2">
          <h3 className="text-gray-700 font-semibold text-sm">Fluxo de Caixa (Últimos 6 Meses)</h3>
        </div>
        {/* Garantindo largura e altura mínimas para o ResponsiveContainer */}
        <div className="h-[250px] min-h-[250px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} dy={5} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(val) => `R$${val / 1000}k`} />
              <Tooltip
                cursor={{ fill: '#f9fafb' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
              <Bar dataKey="Receita" fill="#10B981" radius={[2, 2, 0, 0]} maxBarSize={30} />
              <Bar dataKey="Despesa" fill="#F43F5E" radius={[2, 2, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="animate-fade-in-up delay-700">
        <AIAnalysisCard
          result={aiResult}
          isLoading={isAnalyzing}
          onAnalyze={handleAiAnalysis}
          title="Consultor IA"
          subtitle="Análise estratégica de saúde financeira"
        />
      </div>
    </div >
  );
};
