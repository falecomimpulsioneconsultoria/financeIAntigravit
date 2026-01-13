
import React, { useState, useMemo } from 'react';
import { FinancialSummary, Transaction, Account, Category, User, AIAnalysisResult, TransactionType } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { analyzeFinances } from '../services/geminiService';
import { AIAnalysisCard } from './AIAnalysisCard';

interface DashboardProps {
  summary: FinancialSummary;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ summary, transactions, accounts, categories, user }) => {
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // States for "Agenda Financeira" (Upcoming)
  const [upcomingView, setUpcomingView] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [upcomingFilter, setUpcomingFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

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

  // 2. Upcoming/Pending Data
  const pendingTransactions = useMemo(() => {
      let filtered = transactions.filter(t => 
          !t.parentId && 
          t.status === 'PENDING' &&
          (upcomingFilter === 'ALL' || t.type === upcomingFilter)
      );
      return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, upcomingFilter]);

  // 3. Calendar Grid Generation
  const calendarGrid = useMemo(() => {
      if (upcomingView !== 'CALENDAR') return [];
      const year = calendarMonth.getFullYear();
      const month = calendarMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startDayOfWeek = new Date(year, month, 1).getDay();
      const grid = [];
      for (let i = 0; i < startDayOfWeek; i++) grid.push(null);
      for (let i = 1; i <= daysInMonth; i++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          const dayItems = pendingTransactions.filter(t => t.date === dateStr);
          grid.push({ day: i, dateStr, items: dayItems });
      }
      return grid;
  }, [upcomingView, calendarMonth, pendingTransactions]);

  const handleCalendarNav = (offset: number) => {
      const newDate = new Date(calendarMonth);
      newDate.setMonth(newDate.getMonth() + offset);
      setCalendarMonth(newDate);
  };

  const resultOfMonth = (summary.totalIncome + summary.pendingIncome) - (summary.totalExpense + summary.pendingExpense);
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-600 animate-fade-in-up delay-75">
          <p className="text-xs md:text-xs text-gray-500 font-bold uppercase tracking-wider">Receitas Recebidas</p>
          <p className="text-lg md:text-xl font-bold mt-1 text-emerald-700 truncate">
            R$ {summary.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-400 animate-fade-in-up delay-100">
          <p className="text-xs md:text-xs text-gray-500 font-bold uppercase tracking-wider">Receitas a Receber</p>
          <p className="text-lg md:text-xl font-bold mt-1 text-emerald-500 truncate">
            R$ {summary.pendingIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-rose-600 animate-fade-in-up delay-150">
          <p className="text-xs md:text-xs text-gray-500 font-bold uppercase tracking-wider">Despesas Pagas</p>
          <p className="text-lg md:text-xl font-bold mt-1 text-rose-700 truncate">
            R$ {summary.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-orange-400 animate-fade-in-up delay-200">
          <p className="text-xs md:text-xs text-gray-500 font-bold uppercase tracking-wider">Despesas a Pagar</p>
          <p className="text-lg md:text-xl font-bold mt-1 text-orange-600 truncate">
            R$ {summary.pendingExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    {pendingTransactions.length} pendentes
                </span>
              </h3>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                      <button 
                        onClick={() => setUpcomingView('LIST')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${upcomingView === 'LIST' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                          Lista
                      </button>
                      <button 
                        onClick={() => setUpcomingView('CALENDAR')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${upcomingView === 'CALENDAR' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                          Calendário
                      </button>
                  </div>
                  <select 
                    value={upcomingFilter}
                    onChange={(e) => setUpcomingFilter(e.target.value as any)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
                  >
                      <option value="ALL">Todas</option>
                      <option value="INCOME">Receitas (Entradas)</option>
                      <option value="EXPENSE">Despesas (Saídas)</option>
                  </select>
              </div>
          </div>

          {upcomingView === 'LIST' && (
              <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
                  {pendingTransactions.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                          <p>Nenhuma conta pendente encontrada.</p>
                      </div>
                  ) : (
                      pendingTransactions.map(t => {
                          const dateObj = new Date(t.date + 'T00:00:00');
                          const isIncome = t.type === 'INCOME';
                          const isExpense = t.type === 'EXPENSE';
                          const isOverdue = t.date < todayStr;
                          const isToday = t.date === todayStr;
                          let statusLabel = isOverdue ? 'Atrasado' : (isToday ? 'Vence Hoje' : 'Em dia');
                          let statusColor = isOverdue ? 'bg-red-100 text-red-700' : (isToday ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600');
                          const typeColorClass = isIncome ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : (isExpense ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-blue-600 bg-blue-50 border-blue-100');
                          const amountColorClass = isIncome ? 'text-emerald-700' : (isExpense ? 'text-rose-700' : 'text-blue-700');
                          return (
                              <div key={t.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100 group">
                                  <div className="flex items-center gap-4">
                                      <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border ${typeColorClass} shrink-0`}>
                                          <span className="text-[10px] font-bold uppercase leading-none mb-0.5">{dateObj.toLocaleDateString('pt-BR', {month: 'short'}).replace('.','')}</span>
                                          <span className="text-lg font-bold leading-none">{dateObj.getDate()}</span>
                                      </div>
                                      <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                              <span className="font-bold text-gray-800 truncate">{t.description}</span>
                                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                                                  {statusLabel}
                                              </span>
                                          </div>
                                          <div className="flex items-center gap-2 mt-0.5">
                                              <span className="text-xs text-gray-500">
                                                  {categories.find(c => c.id === t.categoryId)?.name || 'Geral'}
                                              </span>
                                              <span className="text-xs text-gray-300">•</span>
                                              <span className="text-xs font-semibold text-gray-400 uppercase">
                                                  {isIncome ? 'Entrada' : isExpense ? 'Saída' : 'Transf'}
                                              </span>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="text-right pl-4">
                                      <span className={`block font-bold ${amountColorClass}`}>
                                          {isExpense ? '- ' : '+ '}
                                          R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </span>
                                      {t.accountId && (
                                          <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                              {accounts.find(a => a.id === t.accountId)?.name}
                                          </span>
                                      )}
                                  </div>
                              </div>
                          );
                      })
                  )}
              </div>
          )}

          {upcomingView === 'CALENDAR' && (
              <div className="p-4 animate-fade-in">
                  <div className="flex justify-between items-center mb-4">
                      <button onClick={() => handleCalendarNav(-1)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                      <span className="font-bold text-gray-700 capitalize">
                          {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={() => handleCalendarNav(1)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                  </div>
                  <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                          <div key={d} className="bg-gray-50 py-2 text-center text-xs font-bold text-gray-400">{d}</div>
                      ))}
                      {calendarGrid.map((cell, idx) => {
                          if (!cell) return <div key={`empty-${idx}`} className="bg-white min-h-[80px]" />;
                          const hasItems = cell.items.length > 0;
                          const totalDayAmount = cell.items.reduce((acc, t) => {
                              return acc + (t.type === 'INCOME' ? t.amount : -t.amount);
                          }, 0);
                          return (
                              <div key={cell.dateStr} className={`bg-white min-h-[80px] p-1 flex flex-col group relative ${cell.dateStr === todayStr ? 'bg-blue-50/30' : ''}`}>
                                  <span className={`text-[10px] font-bold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${cell.dateStr === todayStr ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>
                                      {cell.day}
                                  </span>
                                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                      {cell.items.slice(0, 3).map((item, i) => (
                                          <div key={i} className={`h-1.5 rounded-full w-full ${item.type === 'INCOME' ? 'bg-emerald-400' : 'bg-rose-400'}`} title={`${item.description}: R$ ${item.amount}`}></div>
                                      ))}
                                      {cell.items.length > 3 && <div className="h-1.5 w-1.5 bg-gray-300 rounded-full mx-auto"></div>}
                                  </div>
                                  {hasItems && (
                                      <div className={`text-[9px] font-bold text-right mt-1 truncate ${totalDayAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {totalDayAmount > 0 ? '+' : ''}{Math.round(totalDayAmount)}
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                  </div>
              </div>
          )}
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
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 10}} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 10}} tickFormatter={(val) => `R$${val/1000}k`} />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                />
                <Legend iconSize={8} wrapperStyle={{fontSize: '10px', paddingTop: '10px'}} />
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
    </div>
  );
};
