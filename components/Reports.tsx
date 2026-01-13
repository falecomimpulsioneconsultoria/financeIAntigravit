
import React, { useState, useMemo } from 'react';
import { Transaction, Category, TransactionType, DreCategory, User, AIAnalysisResult } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';
import { analyzeReport } from '../services/geminiService';
import { Button } from './ui/Button';
import { AIAnalysisCard } from './AIAnalysisCard';

interface ReportsProps {
  transactions: Transaction[];
  categories: Category[];
  user: User;
}

const dreHierarchyMap: Record<string, string> = {
  'DRE_GROSS_REVENUE': 'Receita > Operacional Bruta',
  'DRE_TAXES': 'Deduções > Impostos',
  'DRE_COSTS': 'Custos > Diretos/Serviço',
  'DRE_EXPENSE_PERSONNEL': 'Desp. Operacional > Pessoal',
  'DRE_EXPENSE_COMMERCIAL': 'Desp. Operacional > Comercial',
  'DRE_EXPENSE_ADMIN': 'Desp. Operacional > Administrativa',
  'DRE_FINANCIAL_INCOME': 'Resultado Financeiro > Receitas',
  'DRE_FINANCIAL_EXPENSE': 'Resultado Financeiro > Despesas',
};

const DreRow = ({ 
  label, 
  value, 
  av, 
  type = 'detail', 
  indent = 0,
  isNegative = false 
}: { 
  label: string; 
  value: number; 
  av: number; 
  type?: 'header' | 'subtotal' | 'detail' | 'result'; 
  indent?: number;
  isNegative?: boolean;
}) => {
  const formatCurrency = (val: number) => Math.abs(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const styles = {
    header: "bg-emerald-50/80 text-emerald-900 font-bold border-l-4 border-emerald-500",
    subtotal: "bg-gray-50 text-gray-800 font-bold border-l-4 border-gray-400",
    detail: "bg-white text-gray-600 hover:bg-gray-50 border-l-4 border-transparent transition-colors",
    result: "bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold shadow-md transform scale-[1.01] my-2 rounded-lg border-l-4 border-emerald-400",
    highlight_profit: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg transform scale-[1.01] my-2 rounded-lg border-l-4 border-emerald-200",
    highlight_loss: "bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold shadow-lg transform scale-[1.01] my-2 rounded-lg border-l-4 border-rose-200"
  };
  let className = styles.detail;
  if (type === 'header') className = styles.header;
  if (type === 'subtotal') className = styles.subtotal;
  if (type === 'result') {
      if (value >= 0) className = styles.highlight_profit;
      else className = styles.highlight_loss;
  }
  const valueColor = type === 'result' ? 'text-white' : (isNegative ? 'text-rose-600' : 'text-emerald-700');
  const avColor = type === 'result' ? 'text-white/80' : 'text-gray-400';
  return (
    <div className={`flex items-center justify-between p-3 ${className} ${type !== 'result' ? 'border-b border-gray-50' : ''}`}>
      <div className="flex items-center gap-2 flex-1">
        <div style={{ width: indent * 16 }} />
        <span className={`${type === 'detail' ? 'font-medium' : 'text-lg tracking-tight'}`}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-4 md:gap-8">
        <div className={`text-right ${valueColor} ${type === 'detail' ? 'font-medium' : 'font-bold text-lg'}`}>
           {isNegative && type !== 'result' ? '-' : ''} R$ {formatCurrency(value)}
        </div>
        <div className="w-16 md:w-24 text-right hidden sm:block">
           <span className={`text-xs font-bold ${avColor}`}>{av.toFixed(1)}%</span>
           {type !== 'result' && (
             <div className="h-1 w-full bg-gray-100 rounded-full mt-1 overflow-hidden">
                <div 
                  className={`h-full ${isNegative ? 'bg-rose-300' : 'bg-emerald-300'}`} 
                  style={{ width: `${Math.min(Math.abs(av), 100)}%` }}
                />
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export const Reports: React.FC<ReportsProps> = ({ transactions, categories, user }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'DRE' | 'CATEGORY'>('GENERAL');
  const [isExporting, setIsExporting] = useState(false);
  const [breakdownVisibility, setBreakdownVisibility] = useState({ income: true, expense: true });
  const [collapsedBreakdownIds, setCollapsedBreakdownIds] = useState<Set<string>>(new Set());
  const [accountingBasis, setAccountingBasis] = useState<'COMPETENCE' | 'CASH'>('COMPETENCE');
  const [categoryViewType, setCategoryViewType] = useState<TransactionType>('EXPENSE');

  const currentMonthStr = selectedDate.toISOString().slice(0, 7);
  
  const handleMonthChange = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedDate(newDate);
    setAiAnalysis(null);
  };

  const toggleBreakdown = (id: string) => {
      const newSet = new Set(collapsedBreakdownIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setCollapsedBreakdownIds(newSet);
  };

  const handleExportPDF = () => {
    const element = document.getElementById('report-content-export');
    if (!element) return;
    setIsExporting(true);
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Relatorio-${activeTab}-${accountingBasis}-${selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    // @ts-ignore
    if (window.html2pdf) {
      // @ts-ignore
      window.html2pdf().set(opt).from(element).save().then(() => {
        setIsExporting(false);
      });
    } else {
      alert("Biblioteca de PDF não carregada. Tente recarregar a página.");
      setIsExporting(false);
    }
  };

  const childrenMap = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    transactions.forEach(t => {
        if (t.parentId) {
            const list = map.get(t.parentId) || [];
            list.push(t);
            map.set(t.parentId, list);
        }
    });
    return map;
  }, [transactions]);

  const activeTransactions = useMemo(() => {
    const effectiveBasis = activeTab === 'DRE' ? accountingBasis : 'COMPETENCE';
    if (effectiveBasis === 'CASH') {
        return transactions.filter(t => {
            if (t.status !== 'PAID' || !t.paymentDate || !t.paymentDate.startsWith(currentMonthStr)) return false;
            if (t.parentId) return true;
            const hasChildren = (childrenMap.get(t.id) || []).length > 0;
            if (hasChildren) return false;
            return true;
        });
    }
    return transactions.filter(t => {
        if (!t.date.startsWith(currentMonthStr)) return false;
        if (t.parentId) return false;
        return true;
    });
  }, [transactions, currentMonthStr, accountingBasis, activeTab, childrenMap]);

  const kpis = useMemo(() => {
    const income = activeTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const expense = activeTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    const balance = income - expense;
    const savingsRate = income > 0 ? (balance / income) * 100 : 0;
    const fixedExpenses = activeTransactions.filter(t => t.type === 'EXPENSE' && t.isRecurring).reduce((acc, t) => acc + t.amount, 0);
    const variableExpenses = expense - fixedExpenses;
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const today = new Date().getDate();
    const isCurrentMonth = new Date().toISOString().slice(0, 7) === currentMonthStr;
    const daysDivisor = isCurrentMonth ? today : daysInMonth;
    const dailyAverage = expense / (daysDivisor || 1);
    return { income, expense, balance, savingsRate, fixedExpenses, variableExpenses, dailyAverage, fixedRatio: expense > 0 ? (fixedExpenses / expense) * 100 : 0 };
  }, [activeTransactions, selectedDate, currentMonthStr]);

  const dailyFlowData = useMemo(() => {
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const data = [];
    let cumulativeBalance = 0;
    const effectiveBasis = activeTab === 'DRE' ? accountingBasis : 'COMPETENCE';
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentMonthStr}-${String(i).padStart(2, '0')}`;
        const dayTxs = activeTransactions.filter(t => {
            const tDate = effectiveBasis === 'CASH' ? t.paymentDate : t.date;
            return tDate === dateStr;
        });
        const dayIncome = dayTxs.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
        const dayExpense = dayTxs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
        cumulativeBalance += (dayIncome - dayExpense);
        data.push({ day: i, Entrada: dayIncome, Saída: dayExpense, Acumulado: cumulativeBalance });
    }
    return data;
  }, [activeTransactions, currentMonthStr, selectedDate, accountingBasis, activeTab]);

  const categoryStats = useMemo(() => {
      const filtered = activeTransactions.filter(t => t.type === categoryViewType);
      const totalAmount = filtered.reduce((acc, t) => acc + t.amount, 0);
      const map = new Map<string, { value: number; count: number }>();
      filtered.forEach(t => {
          const current = map.get(t.categoryId) || { value: 0, count: 0 };
          map.set(t.categoryId, { value: current.value + t.amount, count: current.count + 1 });
      });
      const stats = Array.from(map.entries()).map(([catId, data]) => {
          const cat = categories.find(c => c.id === catId);
          return {
              id: catId,
              name: cat?.name || 'Sem Categoria',
              color: cat?.color || 'gray',
              dreCategory: cat?.dreCategory,
              budgetLimit: cat?.budgetLimit || 0,
              value: data.value,
              count: data.count,
              average: data.value / data.count,
              percentage: totalAmount > 0 ? (data.value / totalAmount) * 100 : 0
          };
      }).sort((a, b) => b.value - a.value);
      return { stats, totalAmount };
  }, [activeTransactions, categoryViewType, categories]);

  const categoryMixData = useMemo(() => {
    const expenses = activeTransactions.filter(t => t.type === 'EXPENSE');
    const map = new Map<string, number>();
    expenses.forEach(t => {
      const current = map.get(t.categoryId) || 0;
      map.set(t.categoryId, current + t.amount);
    });
    return Array.from(map.entries())
      .map(([catId, value]) => {
        const cat = categories.find(c => c.id === catId);
        return { name: cat?.name || 'Sem Categoria', value };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [activeTransactions, categories]);

  const calculateBreakdown = (type: TransactionType) => {
    const typeTransactions = activeTransactions.filter(t => t.type === type);
    const totalAmount = typeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const categoryValues: Record<string, number> = {};
    typeTransactions.forEach(t => {
        categoryValues[t.categoryId] = (categoryValues[t.categoryId] || 0) + t.amount;
    });
    const parents = categories.filter(c => c.type === type && !c.parentId);
    const data = parents.map(parent => {
        const directValue = categoryValues[parent.id] || 0;
        const children = categories.filter(c => c.parentId === parent.id);
        const childrenData = children.map(child => {
            const val = categoryValues[child.id] || 0;
            return { ...child, value: val, percentOfParent: 0 };
        }).filter(c => c.value > 0).sort((a, b) => b.value - a.value);
        const childrenTotal = childrenData.reduce((sum, c) => sum + c.value, 0);
        const parentTotal = directValue + childrenTotal;
        childrenData.forEach(c => {
            c.percentOfParent = parentTotal > 0 ? (c.value / parentTotal) * 100 : 0;
        });
        return { ...parent, value: parentTotal, percentOfTotal: totalAmount > 0 ? (parentTotal / totalAmount) * 100 : 0, children: childrenData, hasDirectTransactions: directValue > 0, directValue };
    }).filter(p => p.value > 0).sort((a, b) => b.value - a.value);
    return { data, totalAmount };
  };

  const incomeBreakdownData = useMemo(() => calculateBreakdown('INCOME'), [activeTransactions, categories]);
  const expenseBreakdownData = useMemo(() => calculateBreakdown('EXPENSE'), [activeTransactions, categories]);

  const dreData = useMemo(() => {
      const values: Record<DreCategory, number> = { 'DRE_GROSS_REVENUE': 0, 'DRE_TAXES': 0, 'DRE_COSTS': 0, 'DRE_EXPENSE_PERSONNEL': 0, 'DRE_EXPENSE_COMMERCIAL': 0, 'DRE_EXPENSE_ADMIN': 0, 'DRE_FINANCIAL_INCOME': 0, 'DRE_FINANCIAL_EXPENSE': 0 };
      let unclassifiedIncome = 0;
      let unclassifiedExpense = 0;
      activeTransactions.forEach(t => {
          const category = categories.find(c => c.id === t.categoryId);
          if (category?.dreCategory) values[category.dreCategory] += t.amount;
          else {
              if (t.type === 'INCOME') unclassifiedIncome += t.amount;
              else unclassifiedExpense += t.amount;
          }
      });
      const grossRevenue = values['DRE_GROSS_REVENUE'] + unclassifiedIncome; 
      const taxes = values['DRE_TAXES'];
      const netRevenue = grossRevenue - taxes;
      const costs = values['DRE_COSTS'];
      const contributionMargin = netRevenue - costs;
      const expPersonnel = values['DRE_EXPENSE_PERSONNEL'];
      const expCommercial = values['DRE_EXPENSE_COMMERCIAL'];
      const expAdmin = values['DRE_EXPENSE_ADMIN'] + unclassifiedExpense; 
      const totalOpExpenses = expPersonnel + expCommercial + expAdmin;
      const ebitda = contributionMargin - totalOpExpenses;
      const finIncome = values['DRE_FINANCIAL_INCOME'];
      const finExpense = values['DRE_FINANCIAL_EXPENSE'];
      const finResult = finIncome - finExpense;
      const netProfit = ebitda + finResult;
      return { grossRevenue, taxes, netRevenue, costs, contributionMargin, expPersonnel, expCommercial, expAdmin, totalOpExpenses, ebitda, finIncome, finExpense, finResult, netProfit, unclassifiedIncome, unclassifiedExpense };
  }, [activeTransactions, categories]);

  const calcAV = (val: number) => {
      if (dreData.grossRevenue === 0) return 0;
      return (val / dreData.grossRevenue) * 100;
  };

  const handleDeepAnalysis = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    let context = "";
    let reportType: 'DRE' | 'CATEGORY' | 'GENERAL' = 'GENERAL';
    if (activeTab === 'DRE') {
         reportType = 'DRE';
         context = ` Mês: ${selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} Regime: ${accountingBasis === 'COMPETENCE' ? 'Competência' : 'Caixa'} DADOS DRE: 1. Receita Bruta: R$ ${dreData.grossRevenue.toFixed(2)} ... `;
    } else if (activeTab === 'CATEGORY') {
        reportType = 'CATEGORY';
        const topCats = categoryStats.stats.slice(0, 5).map(c => `${c.name}: R$ ${c.value.toFixed(2)} (${c.percentage.toFixed(1)}%)`).join(', ');
        context = ` Tipo: ${categoryViewType === 'EXPENSE' ? 'Despesas' : 'Receitas'} Total: R$ ${categoryStats.totalAmount.toFixed(2)} Top 5: ${topCats} `;
    } else {
        reportType = 'GENERAL';
        context = ` Mês: ${selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} KPIs: Receita R$ ${kpis.income}, Despesa R$ ${kpis.expense} `;
    }
    try {
        const result = await analyzeReport(context, reportType);
        setAiAnalysis(result);
    } catch (e) {
        console.error(e);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const renderBreakdownColumn = (title: string, breakdown: { data: any[], totalAmount: number }, themeColor: 'emerald' | 'rose') => {
    const isEmerald = themeColor === 'emerald';
    const bgHeader = isEmerald ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800';
    const barColor = isEmerald ? 'bg-emerald-500' : 'bg-rose-500';
    const barSubColor = isEmerald ? 'bg-emerald-400' : 'bg-rose-400';
    return (
        <div className="flex-1 min-w-0">
            <div className={`p-4 rounded-t-xl border-b border-gray-100 ${bgHeader}`}>
                <div className="flex justify-between items-center">
                    <h4 className="font-bold text-lg">{title}</h4>
                    <span className="font-bold">R$ {breakdown.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
            <div className="p-4 bg-white rounded-b-xl border border-t-0 border-gray-100 space-y-6">
                {breakdown.data.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">Nenhum dado registrado.</div>
                ) : (
                    breakdown.data.map((parent) => {
                        const isCollapsed = collapsedBreakdownIds.has(parent.id);
                        const hasChildren = parent.children.length > 0 || parent.hasDirectTransactions;
                        return (
                        <div key={parent.id} className="space-y-2">
                            <div className={`cursor-pointer transition-opacity ${hasChildren ? 'hover:opacity-80' : ''}`} onClick={() => hasChildren && toggleBreakdown(parent.id)}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg bg-${parent.color}-100 text-${parent.color}-600 flex items-center justify-center shrink-0`}>
                                            <span className="font-bold text-sm">{parent.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-gray-800">{parent.name}</p>
                                            {hasChildren && <svg className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-800">R$ {parent.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        <p className="text-xs text-gray-400">{parent.percentOfTotal.toFixed(1)}%</p>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-3">
                                    <div className={`h-full ${barColor}`} style={{ width: `${parent.percentOfTotal}%` }}></div>
                                </div>
                            </div>
                            {!isCollapsed && (
                                <div className="pl-11 space-y-3 animate-fade-in">
                                    {parent.hasDirectTransactions && (
                                        <div className="relative">
                                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                <span>(Sem subcategoria)</span>
                                                <div className="flex gap-2"><span>R$ {parent.directValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span><span className="w-8 text-right">{(parent.value > 0 ? (parent.directValue / parent.value) * 100 : 0).toFixed(0)}%</span></div>
                                            </div>
                                        </div>
                                    )}
                                    {parent.children.map((child: any) => (
                                        <div key={child.id} className="relative">
                                            <div className="flex justify-between text-xs text-gray-600 mb-1"><span>{child.name}</span><div className="flex gap-2"><span>R$ {child.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span><span className="w-8 text-right">{child.percentOfParent.toFixed(0)}%</span></div></div>
                                            <div className="h-1 w-full bg-gray-50 rounded-full overflow-hidden"><div className={`h-full ${barSubColor} opacity-70`} style={{ width: `${child.percentOfParent}%` }}></div></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )})
                )}
            </div>
        </div>
    );
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="bg-gray-100 p-1 rounded-lg flex w-full md:w-auto overflow-x-auto shadow-inner">
                <button onClick={() => setActiveTab('GENERAL')} className={`flex-1 md:flex-none px-4 py-2 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'GENERAL' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}>Visão Geral</button>
                <button onClick={() => setActiveTab('CATEGORY')} className={`flex-1 md:flex-none px-4 py-2 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'CATEGORY' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}>Por Categoria</button>
                <button onClick={() => setActiveTab('DRE')} className={`flex-1 md:flex-none px-4 py-2 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'DRE' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}>DRE Gerencial</button>
            </div>
            <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-lg w-full md:w-auto justify-center border border-gray-200">
                <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-white rounded-md transition-all shadow-sm hover:text-blue-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                <span className="text-sm font-bold text-gray-700 w-32 text-center capitalize">{selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-white rounded-md transition-all shadow-sm hover:text-blue-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
            </div>
        </div>

        {activeTab === 'GENERAL' && (
            <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`p-6 rounded-2xl border flex flex-col justify-between ${kpis.savingsRate >= 20 ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100' : kpis.savingsRate > 0 ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100' : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-100'}`}>
                        <div className="flex justify-between items-start"><div><p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{user.accountType === 'BUSINESS' ? 'Margem de Lucro' : 'Taxa de Poupança'}</p><h3 className={`text-3xl font-bold ${kpis.savingsRate >= 0 ? 'text-gray-800' : 'text-red-600'}`}>{kpis.savingsRate.toFixed(1)}%</h3></div><div className="p-2 bg-white/60 rounded-lg"><svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Resultado Líquido</p><h3 className={`text-3xl font-bold ${kpis.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>R$ {kpis.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3></div></div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Estrutura de Custo</p><div className="flex items-end gap-2"><h3 className="text-2xl font-bold text-gray-800">{kpis.fixedRatio.toFixed(0)}%</h3><span className="text-sm text-gray-500 mb-1">Fixo</span></div></div><div className="mt-4 w-full h-2 bg-gray-100 rounded-full overflow-hidden flex"><div className="h-full bg-blue-500" style={{ width: `${Math.min(kpis.fixedRatio, 100)}%` }}></div><div className="h-full bg-orange-400" style={{ width: `${Math.max(0, 100 - kpis.fixedRatio)}%` }}></div></div></div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Média Diária</p><h3 className="text-3xl font-bold text-gray-800">R$ {kpis.dailyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3></div></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm min-w-0">
                        <h3 className="font-bold text-gray-800 mb-6">Fluxo de Caixa (Dia a Dia)</h3>
                        <div className="h-80 min-h-[320px] w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <AreaChart data={dailyFlowData}>
                                    <defs><linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} interval={2} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={(val) => `R$${val/1000}k`} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="Acumulado" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorAcumulado)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm min-w-0">
                        <h3 className="font-bold text-gray-800 mb-6">Top Categorias</h3>
                        <div className="h-80 min-h-[320px] w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart layout="vertical" data={categoryMixData} margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{fill: '#4B5563', fontSize: 11, fontWeight: 600}} />
                                    <Tooltip cursor={{fill: '#F3F4F6'}} formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>{categoryMixData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                
                 <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <h3 className="font-bold text-gray-800 text-lg">Detalhamento Hierárquico</h3>
                        <div className="flex gap-2">
                             <button onClick={() => setBreakdownVisibility(prev => ({...prev, income: !prev.income}))} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all border ${breakdownVisibility.income ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-400 border-gray-200 hover:text-emerald-500 hover:border-emerald-200'}`}>{breakdownVisibility.income ? '✓ Receitas' : 'Receitas'}</button>
                             <button onClick={() => setBreakdownVisibility(prev => ({...prev, expense: !prev.expense}))} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all border ${breakdownVisibility.expense ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-gray-400 border-gray-200 hover:text-rose-500 hover:border-rose-200'}`}>{breakdownVisibility.expense ? '✓ Despesas' : 'Despesas'}</button>
                        </div>
                    </div>
                    <div className="p-6"><div className={`grid gap-8 ${breakdownVisibility.income && breakdownVisibility.expense ? 'md:grid-cols-2' : 'grid-cols-1'}`}>{breakdownVisibility.income && renderBreakdownColumn("Receitas", incomeBreakdownData, 'emerald')}{breakdownVisibility.expense && renderBreakdownColumn("Despesas", expenseBreakdownData, 'rose')}</div></div>
                 </div>
            </div>
        )}

        {activeTab === 'CATEGORY' && (
             <div id="report-content-export" className="space-y-6 animate-fade-in">
                <div className="flex justify-center mb-4"><div className="bg-gray-100 p-1 rounded-lg flex shadow-inner"><button onClick={() => setCategoryViewType('EXPENSE')} className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${categoryViewType === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}>Despesas</button><button onClick={() => setCategoryViewType('INCOME')} className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${categoryViewType === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}>Receitas</button></div></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-w-0">
                        <h3 className="text-lg font-bold text-gray-800 mb-2 w-full text-center">Distribuição</h3>
                        <p className="text-3xl font-bold text-gray-800 mb-8">R$ {categoryStats.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <div className="w-full h-64 min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <PieChart><Pie data={categoryStats.stats} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>{categoryStats.stats.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} /></PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center mt-4">{categoryStats.stats.slice(0, 5).map((entry, index) => (<div key={entry.id} className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span><span>{entry.name}</span></div>))}</div>
                    </div>
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-w-0">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-gray-800">Detalhamento por Categoria</h3><Button onClick={handleExportPDF} isLoading={isExporting} size="sm" variant="secondary" className="text-xs">Baixar PDF</Button></div>
                        <div className="overflow-x-auto"><table className="w-full text-left text-sm text-gray-600"><thead className="bg-gray-50 text-xs uppercase text-gray-400 font-semibold"><tr><th className="px-6 py-4">Categoria</th><th className="px-6 py-4 text-center">Meta / Limite</th><th className="px-6 py-4 text-right">Realizado</th><th className="px-6 py-4 text-center">Desvio</th></tr></thead><tbody className="divide-y divide-gray-100">{categoryStats.stats.map((cat, idx) => { const hasBudget = cat.budgetLimit > 0; const difference = hasBudget ? cat.budgetLimit - cat.value : 0; const percentageOfBudget = hasBudget ? (cat.value / cat.budgetLimit) * 100 : 0; let statusColor = "text-gray-500"; let barColor = "bg-blue-500"; if (hasBudget) { if (categoryViewType === 'EXPENSE') { if (cat.value > cat.budgetLimit) { statusColor = "text-red-600"; barColor = "bg-red-500"; } else { statusColor = "text-emerald-600"; barColor = "bg-emerald-500"; } } else { if (cat.value >= cat.budgetLimit) { statusColor = "text-emerald-600"; barColor = "bg-emerald-500"; } else { statusColor = "text-orange-500"; barColor = "bg-orange-400"; } } } return ( <tr key={cat.id} className="hover:bg-gray-50"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="text-gray-400 font-mono text-xs w-4">#{idx + 1}</span><div className={`w-3 h-3 rounded-full bg-${cat.color}-500`}></div><span className="font-bold text-gray-800">{cat.name}</span></div><div className="pl-10 text-xs text-gray-400 mt-1">{cat.dreCategory ? dreHierarchyMap[cat.dreCategory]?.split(' > ')[1] || cat.dreCategory : ''}</div></td><td className="px-6 py-4 text-center font-medium text-gray-500">{hasBudget ? `R$ ${cat.budgetLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td><td className="px-6 py-4"><div className="flex flex-col items-end gap-1"><span className="font-bold text-gray-900">R$ {cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>{hasBudget && <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${barColor}`} style={{ width: `${Math.min(percentageOfBudget, 100)}%` }}></div></div>}</div></td><td className="px-6 py-4 text-center">{hasBudget ? <span className={`text-xs font-bold px-2 py-1 rounded border ${statusColor.replace('text-', 'bg-').replace('600', '50').replace('500', '50')} ${statusColor.replace('text-', 'border-').replace('600', '200').replace('500', '200')}`}>{difference >= 0 ? (categoryViewType === 'EXPENSE' ? 'Economia: ' : 'Falta: ') : (categoryViewType === 'EXPENSE' ? 'Excesso: ' : 'Superou: ')} R$ {Math.abs(difference).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> : <span className="text-gray-300">-</span>}</td></tr> )})}</tbody></table></div>
                    </div>
                </div>
             </div>
        )}

        {activeTab === 'DRE' && (
            <div className="space-y-8 animate-fade-in">
                <div className="flex justify-center"><div className="bg-gray-100 p-1 rounded-lg flex shadow-sm border border-gray-200"><button onClick={() => setAccountingBasis('COMPETENCE')} className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${accountingBasis === 'COMPETENCE' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}>Regime de Competência</button><button onClick={() => setAccountingBasis('CASH')} className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${accountingBasis === 'CASH' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}>Regime de Caixa</button></div></div>
                <div id="report-content-export" className="w-full bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100"><div className="p-8 bg-gradient-to-r from-gray-900 to-gray-800 text-white relative overflow-hidden"><div className="relative z-10 flex flex-col md:flex-row justify-between md:items-start gap-4"><div><h2 className="text-2xl font-bold">Demonstração do Resultado</h2><p className="text-sm text-gray-400 mt-1">{accountingBasis === 'COMPETENCE' ? 'Regime de Competência' : 'Regime de Caixa'}</p></div><div className="flex flex-col gap-3"><Button onClick={handleExportPDF} isLoading={isExporting} variant="ghost" className="bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-sm text-xs py-2 h-auto" title="Salvar como PDF">{!isExporting && <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>} Exportar PDF</Button></div></div><div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div></div><div className="p-4 md:p-8 bg-white space-y-2"><div className="flex justify-between px-3 text-xs uppercase text-gray-400 font-bold tracking-wider mb-4 border-b border-gray-100 pb-2"><span>Estrutura</span><div className="flex gap-8"><span className="text-right w-24">Valor</span><span className="text-right w-24 hidden sm:block">AV %</span></div></div><DreRow label="(+) RECEITA BRUTA" value={dreData.grossRevenue} av={100} type="header" /><DreRow label="(-) Impostos sobre Vendas" value={dreData.taxes} av={calcAV(dreData.taxes)} isNegative indent={1} /><DreRow label="(=) RECEITA LÍQUIDA" value={dreData.netRevenue} av={calcAV(dreData.netRevenue)} type="subtotal" /><div className="h-4"></div><DreRow label="(-) Custos do Serviço" value={dreData.costs} av={calcAV(dreData.costs)} isNegative indent={1} /><DreRow label="(=) MARGEM DE CONTRIBUIÇÃO" value={dreData.contributionMargin} av={calcAV(dreData.contributionMargin)} type="subtotal" /><div className="h-4"></div><div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 mb-2">Despesas Operacionais</div><DreRow label="(-) Despesas com Pessoal" value={dreData.expPersonnel} av={calcAV(dreData.expPersonnel)} isNegative indent={1} /><DreRow label="(-) Despesas Comerciais" value={dreData.expCommercial} av={calcAV(dreData.expCommercial)} isNegative indent={1} /><DreRow label="(-) Despesas Administrativas" value={dreData.expAdmin} av={calcAV(dreData.expAdmin)} isNegative indent={1} /><div className="h-4"></div><DreRow label="(=) E.B.I.T.D.A." value={dreData.ebitda} av={calcAV(dreData.ebitda)} type="subtotal" /><DreRow label="(+/-) Resultado Financeiro" value={dreData.finResult} av={calcAV(dreData.finResult)} isNegative={dreData.finResult < 0} indent={1} /><div className="h-8 border-t border-gray-100 mt-4"></div><DreRow label="(=) LUCRO LÍQUIDO DO EXERCÍCIO" value={dreData.netProfit} av={calcAV(dreData.netProfit)} type="result" /></div></div>
            </div>
        )}

        <div className="mt-8"><AIAnalysisCard result={aiAnalysis} isLoading={isAnalyzing} onAnalyze={handleDeepAnalysis} title={activeTab === 'DRE' ? 'Consultor de DRE' : activeTab === 'CATEGORY' ? 'Consultor de Gastos' : 'Consultor Financeiro'} subtitle={activeTab === 'DRE' ? 'Analise a eficiência e margens' : activeTab === 'CATEGORY' ? 'Identifique gargalos' : 'Analise o fluxo de caixa'} buttonText={aiAnalysis ? 'Regerar Análise' : 'Gerar Análise IA'} /></div>
    </div>
  );
};
