
import React, { useState, useEffect, useMemo } from 'react';
import { Dashboard } from './components/Dashboard';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { CategoryManager } from './components/CategoryManager';
import { AdminPanel } from './components/AdminPanel'; 
import { AccountList } from './components/AccountList';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { Transaction, Account, Category, FinancialSummary, User, DashboardConfig, UserPermissions, PaymentMethod, TransactionType, TransactionStatus } from './types';
import { Button } from './components/ui/Button';
import { AuthScreen } from './components/Auth';
import { authService } from './services/authService';
import { dataService } from './services/dataService';

const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  showBalanceCard: true,
  showIncomeCard: true,
  showExpenseCard: true,
  showPendingCard: true,
  showAIAnalysis: true,
  showCharts: true
};

const DEFAULT_PERMISSIONS: UserPermissions = {
  viewDashboard: true,
  manageTransactions: true,
  manageAccounts: true,
  manageCategories: true,
  viewReports: true,
  viewSettings: true
};

type ViewState = 'DASHBOARD' | 'TRANSACTIONS' | 'ACCOUNTS' | 'CATEGORIES' | 'REPORTS' | 'ADMIN' | 'SETTINGS';

interface TransactionFormData extends Omit<Transaction, 'id'> {
  recurrenceCount?: number;
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
    const { recurrenceCount, ...transactionData } = data;

    if (editingTransaction) {
      if (editingTransaction.status === 'PAID') {
           let reversal = editingTransaction.type === 'INCOME' ? -editingTransaction.amount : editingTransaction.amount;
           await updateAccountBalance(editingTransaction.accountId, reversal);
           if (editingTransaction.type === 'TRANSFER' && editingTransaction.toAccountId) {
               await updateAccountBalance(editingTransaction.toAccountId, -editingTransaction.amount);
           }
      }

      const updatedTx = { ...transactionData, id: editingTransaction.id } as Transaction;
      await dataService.updateTransaction(currentUser.id, updatedTx);

      if (transactionData.status === 'PAID') {
          let change = transactionData.type === 'INCOME' ? transactionData.amount : -transactionData.amount;
          await updateAccountBalance(transactionData.accountId, change);
          if (transactionData.type === 'TRANSFER' && transactionData.toAccountId) {
              await updateAccountBalance(transactionData.toAccountId, transactionData.amount);
          }
      }
      await fetchData(currentUser.id);
    } else {
      const baseId = crypto.randomUUID();
      const count = (transactionData.isRecurring && recurrenceCount) ? recurrenceCount : 1;
      const initialDate = new Date(transactionData.date);
      for (let i = 0; i < count; i++) {
         const currentTxDate = new Date(initialDate);
         currentTxDate.setMonth(initialDate.getMonth() + i);
         const dateStr = currentTxDate.toISOString().split('T')[0];
         const txStatus = i === 0 ? transactionData.status : 'PENDING';
         const newTx: Transaction = {
             ...transactionData,
             id: i === 0 ? baseId : crypto.randomUUID(),
             date: dateStr,
             paymentDate: (txStatus === 'PAID') ? transactionData.paymentDate : undefined,
             status: txStatus,
             installmentCurrent: transactionData.isRecurring ? i + 1 : undefined,
             installmentTotal: transactionData.isRecurring ? count : undefined
         };
         await dataService.createTransaction(currentUser.id, newTx);
         if (txStatus === 'PAID') {
            let change = newTx.type === 'INCOME' ? newTx.amount : -newTx.amount;
            await updateAccountBalance(newTx.accountId, change);
            if (newTx.type === 'TRANSFER' && newTx.toAccountId) await updateAccountBalance(newTx.toAccountId, newTx.amount);
         }
      }
      await fetchData(currentUser.id);
    }
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const deleteTransaction = async (id: string) => {
    if (!currentUser) return;
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    if (!window.confirm(`Deseja realmente excluir "${target.description}"?`)) return;

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

  const handleSettleTransaction = async (id: string, actualAmount: number, paymentDate: string, description: string) => {
    if (!currentUser) return;
    const parentTx = transactions.find(t => t.id === id);
    if (!parentTx) return;

    const childTx: Transaction = {
        ...parentTx,
        id: crypto.randomUUID(),
        parentId: parentTx.id,
        amount: actualAmount,
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

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    await fetchData(user.id);
    setActiveView('DASHBOARD');
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setTransactions([]);
    setAccounts([]);
    setCategories([]);
    setActiveView('DASHBOARD');
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

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm animate-fade-in" onClick={() => setIsMobileMenuOpen(false)} />}
      <aside className={`fixed md:relative z-50 h-full bg-white flex flex-col transition-all duration-300 border-r border-gray-100 shadow-sm ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'} ${isSidebarOpen ? 'md:w-72' : 'md:w-24'}`} onMouseEnter={() => !isSidebarPinned && setIsSidebarHovered(true)} onMouseLeave={() => setIsSidebarHovered(false)}>
        <div className={`pt-8 pb-4 px-6 flex items-center ${!isSidebarOpen ? 'justify-center' : 'gap-3'}`}>
           <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           </div>
           {isSidebarOpen && <h1 className="text-xl font-bold text-gray-900 tracking-tight">Finances AI</h1>}
        </div>

        <div onClick={() => handleNavClick('SETTINGS')} className={`mx-4 mb-4 p-3 rounded-2xl border transition-all cursor-pointer hover:bg-gray-100/50 ${activeView === 'SETTINGS' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'} ${!isSidebarOpen ? 'px-0 border-transparent bg-transparent' : ''}`}>
          <div className={`flex items-center ${!isSidebarOpen ? 'justify-center' : 'gap-3'}`}>
            <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
              {currentUser.photoUrl ? <img src={currentUser.photoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-blue-700 font-bold text-lg">{currentUser.name.charAt(0).toUpperCase()}</span>}
            </div>
            {isSidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-800 truncate leading-tight">{currentUser.name.split(' (Acesso:')[0]}</p>
                <p className="text-[10px] text-gray-400 font-medium truncate">{currentUser.email}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-visible py-2">
           {permissions.viewDashboard && (
             <button onClick={() => handleNavClick('DASHBOARD')} className={`group flex items-center ${!isSidebarOpen ? 'justify-center px-2' : 'gap-3 px-4'} py-3.5 rounded-xl transition-all duration-200 font-semibold w-full ${activeView === 'DASHBOARD' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-1 2h-2a2 2 0 01-2-2v-2z" /></svg>
                {isSidebarOpen && <span>Dashboard</span>}
             </button>
           )}
           <button onClick={() => handleNavClick('TRANSACTIONS')} className={`group flex items-center ${!isSidebarOpen ? 'justify-center px-2' : 'gap-3 px-4'} py-3.5 rounded-xl transition-all duration-200 font-semibold w-full ${activeView === 'TRANSACTIONS' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              {isSidebarOpen && <span>Lançamentos</span>}
           </button>
           <button onClick={() => handleNavClick('ACCOUNTS')} className={`group flex items-center ${!isSidebarOpen ? 'justify-center px-2' : 'gap-3 px-4'} py-3.5 rounded-xl transition-all duration-200 font-semibold w-full ${activeView === 'ACCOUNTS' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              {isSidebarOpen && <span>Contas</span>}
           </button>
           <button onClick={() => handleNavClick('CATEGORIES')} className={`group flex items-center ${!isSidebarOpen ? 'justify-center px-2' : 'gap-3 px-4'} py-3.5 rounded-xl transition-all duration-200 font-semibold w-full ${activeView === 'CATEGORIES' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              {isSidebarOpen && <span>Categorias</span>}
           </button>
           {permissions.viewReports && (
             <button onClick={() => handleNavClick('REPORTS')} className={`group flex items-center ${!isSidebarOpen ? 'justify-center px-2' : 'gap-3 px-4'} py-3.5 rounded-xl transition-all duration-200 font-semibold w-full ${activeView === 'REPORTS' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {isSidebarOpen && <span>Relatórios</span>}
             </button>
           )}
        </nav>

        <div className="p-4 space-y-2 border-t border-gray-50 mt-auto">
           <button onClick={handleLogout} className={`w-full flex items-center ${!isSidebarOpen ? 'justify-center' : 'gap-3 px-4'} text-red-500 hover:bg-red-50 hover:text-red-600 p-3 rounded-xl transition-all duration-200 group font-medium`}>
             <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
             {isSidebarOpen && <span className="text-sm">Sair</span>}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="md:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between z-30">
           <div className="flex items-center gap-3"><span className="font-bold text-gray-800">Finances AI</span></div>
           <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg></button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
           {loadingData ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div> : (
               <div key={activeView} className="animate-fade-in-up h-full">
               {activeView === 'DASHBOARD' && <Dashboard summary={financialSummary} transactions={transactions} accounts={accounts} categories={categories} user={currentUser} />}
               {activeView === 'TRANSACTIONS' && (
                 <div className="space-y-6 w-full">
                   <div className="flex justify-between items-center">
                     <h2 className="text-2xl font-bold text-gray-800">Lançamentos</h2>
                     <Button onClick={() => handleOpenTransactionModal('EXPENSE')}>Novo Lançamento</Button>
                   </div>
                   <TransactionList 
                     transactions={transactions} 
                     accounts={accounts} 
                     categories={categories}
                     onDelete={deleteTransaction}
                     onEdit={(t) => { setEditingTransaction(t); setIsModalOpen(true); }}
                     onToggleStatus={() => {}} 
                     onSettleTransaction={handleSettleTransaction}
                   />
                 </div>
               )}
               {activeView === 'ACCOUNTS' && <div className="w-full"><AccountList accounts={accounts} transactions={transactions} onAdd={handleAddAccount} onEdit={handleEditAccount} onDelete={handleDeleteAccount} /></div>}
               {activeView === 'CATEGORIES' && <div className="w-full"><CategoryManager categories={categories} onAdd={handleAddCategory} onEdit={handleEditCategory} onDelete={handleDeleteCategory} /></div>}
               {activeView === 'REPORTS' && permissions.viewReports && <div className="w-full"><Reports transactions={transactions} categories={categories} user={currentUser} /></div>}
               {activeView === 'ADMIN' && currentUser.role === 'ADMIN' && <div className="w-full"><AdminPanel /></div>}
               {activeView === 'SETTINGS' && permissions.viewSettings && (
                  <Settings 
                    config={dashboardConfig} 
                    onSave={setDashboardConfig} 
                    user={currentUser} 
                    onUpdateUser={setCurrentUser} 
                    paymentMethods={paymentMethods}
                    transactions={transactions} 
                    onResetData={handleResetData}
                  />
               )}
           </div>
           )}
        </div>
      </main>

      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800">{editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
                        <button onClick={() => { setIsModalOpen(false); setEditingTransaction(null); }} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <TransactionForm 
                        accounts={accounts}
                        categories={categories}
                        paymentMethods={paymentMethods}
                        initialData={editingTransaction}
                        initialType={modalInitialType}
                        onSubmit={handleSaveTransaction}
                        onCancel={() => { setIsModalOpen(false); setEditingTransaction(null); }}
                    />
                </div>
            </div>
         </div>
       )}
    </div>
  );
}
