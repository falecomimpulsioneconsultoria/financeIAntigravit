import React, { useState, useEffect, useMemo } from 'react';
// import { Dashboard } from './components/Dashboard'; // REMOVED
import { DashboardV2 } from './components/DashboardV2';
import { TransactionModal } from './components/TransactionModal';
import { TransactionList } from './components/TransactionList';
import { CategoryManager } from './components/CategoryManager';
import { AccountList } from './components/AccountList';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminAccounts } from './components/admin/AdminAccounts';
import { AdminPlans } from './components/admin/AdminPlans';
import { AdminPayments } from './components/admin/AdminPayments';
import { AdminSettings } from './components/admin/AdminSettings';
import { InvestmentDashboard } from './components/investments/InvestmentDashboard';
import { Transaction, Account, Category, FinancialSummary, User, DashboardConfig, UserPermissions, PaymentMethod, TransactionType } from './types';
import { AuthScreen } from './components/Auth';
import { authService } from './services/authService';
import { dataService } from './services/dataService';
import { ConfirmModal } from './components/ui/ConfirmModal';
import { ErrorBoundary } from './components/ErrorBoundary';

const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  showBalanceCard: true,
  showIncomeCard: true,
  showExpenseCard: true,
  showPendingCard: true,
  showAIAnalysis: true,
  showCharts: true,
  currency: 'BRL'
};

const DEFAULT_PERMISSIONS: UserPermissions = {
  viewDashboard: true,
  manageTransactions: true,
  manageAccounts: true,
  manageCategories: true,
  viewReports: true,
  viewSettings: true
};

type ViewState = 'DASHBOARD' | 'TRANSACTIONS' | 'ACCOUNTS' | 'CATEGORIES' | 'REPORTS' | 'SETTINGS' | 'ADMIN' | 'ADMIN_USERS' | 'ADMIN_ACCOUNTS' | 'ADMIN_PLANS' | 'ADMIN_PAYMENTS' | 'ADMIN_SETTINGS' | 'INVESTMENTS';

interface TransactionFormData extends Omit<Transaction, 'id'> {
  recurrenceCount?: number;
  file?: File;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentUser());
  const [loadingData, setLoadingData] = useState(false);

  const [activeView, setActiveView] = useState<ViewState>('DASHBOARD');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>(DEFAULT_DASHBOARD_CONFIG);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<TransactionType>('EXPENSE');
  const isSidebarOpen = isSidebarPinned || isSidebarHovered;
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Navigation State
  const [transactionViewFilters, setTransactionViewFilters] = useState<{start: string, end: string, highlightId?: string} | undefined>(undefined);


  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'danger'
  });

  useEffect(() => {
    const initSession = async () => {
      try {
        const user = await authService.getSessionUser();
        if (user) {
          setCurrentUser(user);
          await fetchData(user.id);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Session init error", error);
        setLoadingData(false);
      }
    };
    initSession();
  }, []);

  const fetchData = async (userId: string) => {
    setLoadingData(true);
    try {
      const [txs, accs, cats, methods] = await Promise.all([
        dataService.getTransactions(userId),
        dataService.getAccounts(userId),
        dataService.getCategories(userId),
        dataService.getPaymentMethods(userId)
      ]);
      setTransactions(txs || []);
      setAccounts(accs || []);
      setCategories(cats || []);
      setPaymentMethods(methods || []);

      const savedConfig = localStorage.getItem(`config_${userId}`);
      if (savedConfig) setDashboardConfig(JSON.parse(savedConfig));
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoadingData(false);
    }
  };

  const updateAccountBalance = async (accId: string, amount: number) => {
    if (!currentUser) return;
    const acc = accounts.find(a => a.id === accId);
    if (acc) {
      const newBalance = acc.balance + amount;
      await dataService.updateAccountBalance(currentUser.id, accId, newBalance);
      setAccounts(prev => prev.map(a => a.id === accId ? { ...a, balance: newBalance } : a));
    }
  };

  const handleSaveTransaction = async (data: TransactionFormData) => {
    if (!currentUser) return;
    const { recurrenceCount, file, ...transactionData } = data;

    let finalReceiptUrl = transactionData.receiptUrl;

    if (file) {
      const url = await dataService.uploadReceipt(currentUser.id, file);
      if (url) finalReceiptUrl = url;
    }

    const payload = {
      ...transactionData,
      receiptUrl: finalReceiptUrl,
      recurrenceCount: recurrenceCount
    };

    if (editingTransaction) {
      if (editingTransaction.status === 'PAID') {
        let reversal = editingTransaction.type === 'INCOME' ? -editingTransaction.amount : editingTransaction.amount;
        await updateAccountBalance(editingTransaction.accountId, reversal);
        if (editingTransaction.type === 'TRANSFER' && editingTransaction.toAccountId) {
          await updateAccountBalance(editingTransaction.toAccountId, -editingTransaction.amount);
        }
      }

      const updatedTx = { ...payload, id: editingTransaction.id } as Transaction;
      await dataService.updateTransaction(currentUser.id, updatedTx);

      if (payload.status === 'PAID') {
        let change = payload.type === 'INCOME' ? payload.amount : -payload.amount;
        await updateAccountBalance(payload.accountId, change);
        if (payload.type === 'TRANSFER' && payload.toAccountId) {
          await updateAccountBalance(payload.toAccountId, payload.amount);
        }
      }
      await fetchData(currentUser.id);
    } else {
      const result = await dataService.createTransaction(currentUser.id, payload);

      if (result && payload.status === 'PAID') {
        let amountToUpdate = payload.amount;
        // If installment, calculate first installment amount if needed, but dataService splits it. 
        // Logic: if installment, createTransaction creates multiple. We need to know which one we are updating balance for. 
        // We assume we update balance for the FIRST one only if paid.
        if (payload.isRecurring && payload.recurringType === 'INSTALLMENT' && payload.recurrenceCount) {
          amountToUpdate = payload.amount / payload.recurrenceCount;
        }

        if (!payload.isRecurring || payload.recurringType === 'FIXED' || (payload.isRecurring && payload.recurringType === 'INSTALLMENT')) {
          let change = payload.type === 'INCOME' ? amountToUpdate : -amountToUpdate;
          await updateAccountBalance(payload.accountId, change);
          if (payload.type === 'TRANSFER' && payload.toAccountId) await updateAccountBalance(payload.toAccountId, -change);
        }
      }

      await fetchData(currentUser.id);
    }
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const deleteTransaction = async (id: string, force: boolean = false) => {
    if (!currentUser) return;
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    const hasChildren = transactions.some(t => t.parentId === id);
    if (hasChildren && !force) {
      setConfirmModal({
        isOpen: true,
        title: 'Ações Necessárias',
        message: `Este lançamento possui baixas ou parcelas vinculadas. Exclua primeiro os lançamentos "filhos" para poder remover este lançamento pai.`,
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
        variant: 'warning'
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Exclusão',
      message: `Deseja realmente excluir "${target.description}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setLoadingData(true);
          if (target.status === 'PAID') {
            let change = target.type === 'INCOME' ? -target.amount : target.amount;
            await updateAccountBalance(target.accountId, change);
          }
          await dataService.deleteTransaction(currentUser.id, id);
          await fetchData(currentUser.id);
        } catch (error) {
          console.error("Erro ao excluir:", error);
          alert("Ocorreu um erro ao excluir o lançamento.");
        } finally {
          setLoadingData(false);
        }
      },
      variant: 'danger'
    });
  };

  const handleResetData = async (deleteCategories: boolean) => {
    if (!currentUser) return;
    try {
      setLoadingData(true);
      await dataService.resetUserData(currentUser.id, deleteCategories);
      await fetchData(currentUser.id);
      alert("Dados zerados com sucesso!");
    } catch (error) {
      console.error("Erro ao zerar dados:", error);
      alert("Falha ao zerar dados.");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSettleTransaction = async (
    id: string,
    actualAmount: number,
    paymentDate: string,
    description: string,
    accountId: string,
    paymentMethodId?: string,
    tags?: string[],
    observation?: string,
    file?: File
  ) => {
    if (!currentUser) return;
    const parentTx = transactions.find(t => t.id === id);
    if (!parentTx) return;

    let finalReceiptUrl = undefined;
    if (file) {
      const url = await dataService.uploadReceipt(currentUser.id, file);
      if (url) finalReceiptUrl = url;
    }

    const childTx: Transaction = {
      ...parentTx,
      id: crypto.randomUUID(),
      parentId: parentTx.id,
      amount: actualAmount,
      accountId: accountId,
      paymentMethodId: paymentMethodId,
      tags: tags,
      observation: observation,
      receiptUrl: finalReceiptUrl,
      status: 'PAID',
      paymentDate: paymentDate,
      date: paymentDate,
      description: description || `Baixa: ${parentTx.description}`,
      isRecurring: false,
    };

    let change = childTx.type === 'INCOME' ? actualAmount : -actualAmount;
    await updateAccountBalance(childTx.accountId, change);
    if (childTx.type === 'TRANSFER' && childTx.toAccountId) await updateAccountBalance(childTx.toAccountId, childTx.amount);

    await dataService.createTransaction(currentUser.id, childTx);

    const siblings = transactions.filter(t => t.parentId === parentTx.id);
    const totalPaid = siblings.reduce((acc, t) => acc + (t.status === 'PAID' ? t.amount : 0), 0) + actualAmount;

    if (totalPaid >= parentTx.amount - 0.01) {
      await dataService.updateTransaction(currentUser.id, { ...parentTx, status: 'PAID' });
    }
    await fetchData(currentUser.id);
  };

  const financialSummary: FinancialSummary = useMemo(() => {
    const rootTransactions = transactions.filter(t => !t.parentId);
    const incomeRealized = transactions.filter(t => t.type === 'INCOME' && t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);
    const expenseRealized = transactions.filter(t => t.type === 'EXPENSE' && t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);

    const incomePending = rootTransactions
      .filter(t => t.type === 'INCOME' && t.status === 'PENDING')
      .reduce((acc, t) => {
        const paid = transactions.filter(c => c.parentId === t.id && c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0);
        return acc + Math.max(0, t.amount - paid);
      }, 0);

    const expensePending = rootTransactions
      .filter(t => t.type === 'EXPENSE' && t.status === 'PENDING')
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
  }, [transactions, accounts]);

  const handleAddAccount = async (data: Omit<Account, 'id'>) => {
    if (!currentUser) return;
    const result = await dataService.createAccount(currentUser.id, data);
    if (result) {
      await fetchData(currentUser.id);
    } else {
      alert("Erro ao salvar conta. Verifique os logs do console para detalhes.");
    }
  };

  const handleEditAccount = async (id: string, data: Omit<Account, 'id'>) => {
    if (!currentUser) return;
    const updatedAccount: Account = { ...data, id };
    await dataService.updateAccount(currentUser.id, updatedAccount);
    await fetchData(currentUser.id);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!currentUser) return;
    await dataService.deleteAccount(currentUser.id, id);
    await fetchData(currentUser.id);
  };

  const handleAddCategory = async (data: Omit<Category, 'id'>) => {
    if (!currentUser) return;
    const newCategory: Category = { ...data, id: crypto.randomUUID() };
    await dataService.createCategory(currentUser.id, newCategory);
    await fetchData(currentUser.id);
  };

  const handleEditCategory = async (id: string, data: Omit<Category, 'id'>) => {
    if (!currentUser) return;
    const updatedCategory: Category = { ...data, id };
    await dataService.updateCategory(currentUser.id, updatedCategory);
    await fetchData(currentUser.id);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!currentUser) return;
    await dataService.deleteCategory(currentUser.id, id);
    await fetchData(currentUser.id);
  };

  useEffect(() => {
    const handleOpenNew = () => handleOpenTransactionModal('EXPENSE');
    document.addEventListener('open-new-transaction', handleOpenNew);
    return () => document.removeEventListener('open-new-transaction', handleOpenNew);
  }, []);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    await fetchData(user.id);
    setActiveView('DASHBOARD');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      // Clear local state
      setCurrentUser(null);
      setTransactions([]);
      setAccounts([]);
      setCategories([]);
      setActiveView('DASHBOARD');
      // Force reload to ensure clean memory and auth state
      window.location.reload(); 
    }
  };


  const handleAddPaymentMethod = async (name: string) => {
    if (!currentUser) return;
    await dataService.createPaymentMethod(currentUser.id, name);
    await fetchData(currentUser.id);
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (!currentUser) return;
    await dataService.deletePaymentMethod(currentUser.id, id);
    await fetchData(currentUser.id);
  };

  const handleNavClick = (view: ViewState) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  const handleOpenTransactionModal = (type: TransactionType) => {
    setEditingTransaction(null);
    setModalInitialType(type);
    setIsModalOpen(true);
  };

  if (!currentUser) return <AuthScreen onLogin={handleLogin} />;
  const permissions = currentUser.activePermissions || DEFAULT_PERMISSIONS;

  const renderView = () => {
    switch (activeView) {
      case 'DASHBOARD':
        return (
          <DashboardV2
            summary={financialSummary}
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            user={currentUser}
            onTransactionClick={(t) => {
              setActiveView('TRANSACTIONS');
              setEditingTransaction(t);
              setIsModalOpen(true);
            }}
            onOpenNewTransaction={(type) => handleOpenTransactionModal(type || 'EXPENSE')}
            onNavigateToTransactions={(start, end, highlightId) => {
                setTransactionViewFilters({ start, end, highlightId });
                setActiveView('TRANSACTIONS');
            }}
          />
        );
      // case 'DASHBOARD_V2': REMOVED
      case 'TRANSACTIONS':
        return (
          <div className="h-full w-full">
            <TransactionList
              initialDateRange={transactionViewFilters}
              initialHighlightedId={transactionViewFilters?.highlightId}
              transactions={transactions}
              accounts={accounts}
              categories={categories}
              onDelete={deleteTransaction}
              onEdit={(t) => { setEditingTransaction(t); setIsModalOpen(true); }}
              onToggleStatus={() => { }}
              onSettleTransaction={handleSettleTransaction}
              paymentMethods={paymentMethods}
              availableTags={availableTags}
            />
          </div>
        );
      case 'ACCOUNTS':
        return <div className="w-full"><AccountList accounts={accounts} transactions={transactions} onAdd={handleAddAccount} onEdit={handleEditAccount} onDelete={handleDeleteAccount} /></div>;
      case 'CATEGORIES':
        return <div className="w-full"><CategoryManager categories={categories} onAdd={handleAddCategory} onEdit={handleEditCategory} onDelete={handleDeleteCategory} /></div>;
      case 'INVESTMENTS':
        return <div className="w-full"><InvestmentDashboard user={currentUser} /></div>;
      case 'REPORTS':
        return permissions.viewReports && <div className="w-full"><Reports transactions={transactions} categories={categories} user={currentUser} /></div>;
      case 'ADMIN':
        return currentUser.role === 'ADMIN' && <div className="w-full"><AdminUsers /></div>;
      case 'ADMIN_ACCOUNTS':
        return currentUser.role === 'ADMIN' && <div className="w-full"><AdminAccounts /></div>;
      case 'ADMIN_PLANS':
        return currentUser.role === 'ADMIN' && <div className="w-full"><AdminPlans /></div>;
      case 'ADMIN_PAYMENTS':
        return currentUser.role === 'ADMIN' && <div className="w-full"><AdminPayments /></div>;
      case 'ADMIN_SETTINGS':
        return currentUser.role === 'ADMIN' && <div className="w-full"><AdminSettings /></div>;
      case 'SETTINGS':
        return permissions.viewSettings && (
          <Settings
            config={dashboardConfig}
            onSave={setDashboardConfig}
            user={currentUser}
            onUpdateUser={setCurrentUser}
            paymentMethods={paymentMethods}
            onAddPaymentMethod={handleAddPaymentMethod}
            onDeletePaymentMethod={handleDeletePaymentMethod}
            transactions={transactions}
            onResetData={handleResetData}
          />
        );
      default:
        return null;
    }
  };

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    transactions.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [transactions]);

  return (
    <div className="flex h-screen bg-gray-50/50 font-sans text-gray-900 overflow-hidden">
      <ErrorBoundary>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[150] md:hidden backdrop-blur-sm animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR REESTRUTURADA (FLEXÍVEL) */}
      <aside
        className={`relative h-full bg-white border-r border-gray-100 transition-all duration-300 ease-out z-[100] ${isSidebarOpen ? 'w-64' : 'w-20'} shadow-lg shadow-gray-200/50 flex flex-col shrink-0 overflow-hidden md:flex`}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        {/* LOGO / SISTEMA */}
        <div className="p-5 flex items-center justify-between border-b border-gray-100">
          <div className={`flex items-center ${isSidebarOpen ? 'gap-3' : 'justify-center w-full'}`}>
            <div className={`w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0 transition-all duration-300`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            {isSidebarOpen && (
              <div className="animate-fade-in">
                <p className="text-sm font-bold text-gray-800 tracking-tight">Finances AI</p>
                <p className="text-[10px] text-gray-400 font-medium">Gestão Financeira</p>
              </div>
            )}
          </div>
          {isSidebarOpen && (
            <button
              onClick={() => setIsSidebarPinned(!isSidebarPinned)}
              className={`p-1.5 rounded-md transition-all ${isSidebarPinned ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              title={isSidebarPinned ? 'Retrair menu' : 'Fixar menu'}
            >
              <svg className={`w-4 h-4 transition-transform ${!isSidebarPinned ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* PERFIL DO USUÁRIO */}
        <div onClick={() => handleNavClick('SETTINGS')} className={`mx-3 mt-4 p-3 rounded-xl transition-all cursor-pointer ${activeView === 'SETTINGS' ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'} group`}>
          <div className={`flex items-center ${!isSidebarOpen ? 'justify-center' : 'gap-3'}`}>
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-white shadow-md transition-transform group-hover:scale-105`}>
              {currentUser.photoUrl ? <img src={currentUser.photoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold text-sm">{currentUser.name.charAt(0).toUpperCase()}</span>}
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden animate-fade-in min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{currentUser.email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${currentUser.accountType === 'BUSINESS' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {currentUser.accountType === 'BUSINESS' ? 'Empresa' : 'Pessoal'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* NAVEGAÇÃO PRINCIPAL */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-4">
          {/* MENUS PARA ADMIN */}
          {currentUser.role === 'ADMIN' ? (
            <>
              {[
                { view: 'ADMIN', label: 'Usuários', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
                { view: 'ADMIN_ACCOUNTS', label: 'Contas Br.', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
                { view: 'ADMIN_PLANS', label: 'Planos', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 013.138-3.138z' },
                { view: 'ADMIN_PAYMENTS', label: 'Pagamentos', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
                { view: 'ADMIN_SETTINGS', label: 'Sistema', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
              ].map((item) => (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view as ViewState)}
                  className={`group flex items-center ${!isSidebarOpen ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg transition-all duration-200 w-full ${activeView === item.view ? 'bg-purple-50 text-purple-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                  {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              ))}
            </>
          ) : (
            /* MENUS PARA USUÁRIOS NORMAIS */
            <>
              {[
                { view: 'DASHBOARD', label: 'Dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                { view: 'INVESTMENTS', label: 'Investimentos', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
                { view: 'TRANSACTIONS', label: 'Lançamentos', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                { view: 'ACCOUNTS', label: 'Contas', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
                { view: 'CATEGORIES', label: 'Categorias', icon: 'M7 7h.01M7 11h.01M7 15h.01M11 7h8M11 11h8M11 15h8' },
                ...(permissions.viewReports ? [{ view: 'REPORTS', label: 'Relatórios', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }] : [])
              ].map((item) => (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view as ViewState)}
                  className={`group flex items-center ${!isSidebarOpen ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg transition-all duration-200 w-full ${activeView === item.view ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                  {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              ))}
            </>
          )}
        </nav>

        {/* BOTÃO SAIR */}
        <div className="p-3 border-t border-gray-100">
          <button onClick={handleLogout} className={`w-full flex items-center ${!isSidebarOpen ? 'justify-center' : 'gap-3'} text-gray-400 hover:text-red-500 hover:bg-red-50 px-3 py-2.5 rounded-lg transition-all duration-200 group`}>
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            {isSidebarOpen && <span className="text-sm font-medium">Sair</span>}
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 relative overflow-y-auto bg-gray-50/30 scroll-smooth flex flex-col">
        {/* HEADER MOBILE */}
        <header className="md:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <span className="font-bold text-gray-800 tracking-tight">Finances AI</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 bg-gray-50 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>
        </header>

        <div className={`flex-1 w-full max-w-[1600px] mx-auto relative ${activeView === 'TRANSACTIONS' ? 'overflow-hidden pt-0 pb-0 px-0' : 'overflow-y-auto pt-8 pb-20 px-4 sm:px-6 lg:px-8'}`}>
          {loadingData && (
            <div className="absolute top-0 left-0 right-0 h-1 z-50 overflow-hidden bg-blue-50">
              <div className="h-full bg-blue-600 animate-loading-bar origin-left"></div>
            </div>
          )}
          <div key={activeView} className="animate-fade-in-up h-full w-full">
            {renderView()}
          </div>
        </div>
      </main>

      {/* MODAL DE TRANSAÇÃO (EXPANSÍVEL) */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }}
        accounts={accounts}
        categories={categories}
        paymentMethods={paymentMethods}
        initialData={editingTransaction}
        initialType={modalInitialType}
        currency={dashboardConfig.currency}
        availableTags={availableTags}
        onSubmit={handleSaveTransaction}
      />

      {/* MODAL DE CONFIRMAÇÃO */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        variant={confirmModal.variant}
        confirmLabel={confirmModal.variant === 'warning' ? 'Entendido' : 'Confirmar'}
      />
      </ErrorBoundary>
    </div>
  );
}
