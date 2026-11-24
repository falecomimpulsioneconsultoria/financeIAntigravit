// aria-label added for accessibility
import React, { useState, useEffect, useMemo } from "react";
// import { Dashboard } from './components/Dashboard'; // REMOVED
import { DashboardV2 } from "./components/DashboardV2";
import { TransactionModal } from "./components/TransactionModal";
import { TransactionList } from "./components/TransactionList";
import { CategoryManager } from "./components/CategoryManager";
import { TagManager } from "./components/TagManager";
import { AccountList } from "./components/AccountList";
import { Reports } from "./components/Reports";
import { Settings } from "./components/Settings";
import { AdminUsers } from "./components/admin/AdminUsers";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AdminAccounts } from "./components/admin/AdminAccounts";
import { AdminPlans } from "./components/admin/AdminPlans";
import { AdminPayments } from "./components/admin/AdminPayments";
import { AdminSettings } from "./components/admin/AdminSettings";
import { ImpersonationBanner } from "./components/admin/ImpersonationBanner";
import { SubscriptionAlert } from "./components/subscription/SubscriptionAlert";
import { ContactManager } from "./components/contacts/ContactManager";
import { LoanManager } from "./components/loans/LoanManager";
import { CreateLoanFormPayload } from "./components/loans/LoanFormModal";
import { RegisterLoanPaymentPayload } from "./components/loans/LoanPaymentModal";
import {
  Transaction,
  Account,
  Category,
  FinancialSummary,
  User,
  DashboardConfig,
  UserPermissions,
  PaymentMethod,
  TransactionType,
  Contact,
  DescriptionSuggestion,
  Loan,
} from "./types";
import { AuthScreen } from "./components/Auth";
import { authService } from "./services/authService";
import { dataService } from "./services/dataService";
import { PaymentWall } from "./components/subscription/PaymentWall";
import { SuspensionBanner } from "./components/subscription/SuspensionBanner";
import { useSubscriptionManager } from "./controllers/SubscriptionController";
import { ConfirmModal } from "./components/ui/ConfirmModal";
import { RecurrenceEditSummary } from "./components/ui/RecurrenceEditSummary";
import {
  RecurrenceScopeModal,
  RecurrenceScope,
  applyDayOfMonth,
  getTransactionsByScope,
  isGroupedTransaction,
} from "./components/ui/RecurrenceScopeModal";

const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  showBalanceCard: true,
  showIncomeCard: true,
  showExpenseCard: true,
  showPendingCard: true,
  showAIAnalysis: true,
  showCharts: true,
  currency: "BRL",
};

const DEFAULT_PERMISSIONS: UserPermissions = {
  viewDashboard: true,
  manageTransactions: true,
  manageAccounts: true,
  manageCategories: true,
  viewReports: true,
  viewSettings: true,
};

type ViewState =
  | "DASHBOARD"
  | "TRANSACTIONS"
  | "ACCOUNTS"
  | "CATEGORIES"
  | "REPORTS"
  | "SETTINGS"
  | "ADMIN"
  | "ADMIN_DASHBOARD"
  | "ADMIN_USERS"
  | "ADMIN_ACCOUNTS"
  | "ADMIN_PLANS"
  | "ADMIN_PAYMENTS"
  | "ADMIN_SETTINGS"
  | "TAGS"
  | "CONTACTS"
  | "LOANS";


interface TransactionFormData extends Omit<Transaction, "id"> { saveSuggestion?: boolean;
  recurrenceCount?: number;
  file?: File;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(
    authService.getCurrentUser(),
  );
  const [impersonatedOriginalAdmin, setImpersonatedOriginalAdmin] = useState<User | null>(
    () => authService.getImpersonatedAdmin(),
  );
  const { handlePaymentSimulation } = useSubscriptionManager(
    currentUser || undefined,
  );
  const [loadingData, setLoadingData] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [activeView, setActiveView] = useState<ViewState>("DASHBOARD");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<DescriptionSuggestion[]>([]);

  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>(
    DEFAULT_DASHBOARD_CONFIG,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isSidebarPinned, setIsSidebarPinned] = useState(() => {
    const saved = localStorage.getItem("sidebar_pinned");
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("sidebar_pinned", isSidebarPinned.toString());
  }, [isSidebarPinned]);

  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [modalInitialType, setModalInitialType] =
    useState<TransactionType>("EXPENSE");
  const isSidebarOpen = isSidebarPinned || (!isSidebarPinned && isSidebarHovered);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  // Navigation State
  const [transactionViewFilters, setTransactionViewFilters] = useState<
    { start: string; end: string; highlightId?: string } | undefined
  >(undefined);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    variant: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "danger",
  });

  const [scopeModal, setScopeModal] = useState<{
    isOpen: boolean;
    action: "edit" | "delete";
    target: Transaction | null;
    onConfirm: (scope: RecurrenceScope) => void;
  }>({
    isOpen: false,
    action: "delete",
    target: null,
    onConfirm: () => {},
  });
  const closeScopeModal = () =>
    setScopeModal((prev) => ({ ...prev, isOpen: false }));

  useEffect(() => {
    const initSession = async () => {
      try {
        const user = await authService.getSessionUser();
        const storedAdmin = authService.getImpersonatedAdmin();
        if (storedAdmin) {
          setImpersonatedOriginalAdmin(storedAdmin);
        }
        if (user) {
          setCurrentUser(user);
          const effectiveId = user.ownerId || user.id;
          await fetchData(effectiveId);
          if (!storedAdmin && (user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
            setActiveView("ADMIN_DASHBOARD");
          }
        } else {
          setCurrentUser(null);
          setImpersonatedOriginalAdmin(null);
        }
      } catch (error) {
        console.error("Session init error", error);
        setCurrentUser(null);
        setImpersonatedOriginalAdmin(null);
      } finally {
        setIsInitialLoading(false);
      }
    };
    initSession();
  }, []);

  const handleStartImpersonation = async (targetUser: User) => {
    if (!currentUser) return;
    const adminUser = impersonatedOriginalAdmin || currentUser;
    authService.startImpersonation(adminUser, targetUser);
    setImpersonatedOriginalAdmin(adminUser);
    setCurrentUser(targetUser);
    setActiveView("DASHBOARD");
    await fetchData(targetUser.ownerId || targetUser.id);
  };

  const handleStopImpersonation = async () => {
    const originalAdmin = authService.stopImpersonation();
    if (originalAdmin) {
      setImpersonatedOriginalAdmin(null);
      setCurrentUser(originalAdmin);
      setActiveView("ADMIN_USERS");
      await fetchData(originalAdmin.id);
    }
  };

  const fetchData = async (userId: string) => {
    setLoadingData(true);
    try {
      const [txs, accs, cats, methods, ctcts, sugs, lns] = await Promise.all([
        dataService.getTransactions(userId),
        dataService.getAccounts(userId),
        dataService.getCategories(userId),
        dataService.getPaymentMethods(userId),
        dataService.getContacts(userId),
        dataService.getDescriptionSuggestions(userId),
        dataService.getLoans(userId),
      ]);
      setTransactions(txs || []);
      setAccounts(accs || []);
      setCategories(cats || []);
      setPaymentMethods(methods || []);
      setContacts(ctcts || []);
      setDescriptionSuggestions(sugs || []);
      setLoans(lns || []);

      const savedConfig = localStorage.getItem(`config_${userId}`);
      if (savedConfig) setDashboardConfig(JSON.parse(savedConfig));
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoadingData(false);
    }
  };


  // Balance is now automatically recalculated by the database trigger
  // (tr_recalculate_balance) on every INSERT/UPDATE/DELETE on transactions.

  const handleSaveTransaction = async (data: TransactionFormData) => {
    if (!currentUser) return;
    const { recurrenceCount, file, saveSuggestion, ...transactionData } = data;

    if (saveSuggestion && transactionData.description) {
      await dataService.addDescriptionSuggestion(currentUser.ownerId || currentUser.id, transactionData.description);
      // Let it refresh when fetchData runs below
    }

    let finalReceiptUrl = transactionData.receiptUrl;

    if (file) {
      const url = await dataService.uploadReceipt(currentUser.id, file);
      if (url) finalReceiptUrl = url;
    }

    const payload = {
      ...transactionData,
      receiptUrl: finalReceiptUrl,
      recurrenceCount: recurrenceCount,
    };

    if (editingTransaction) {
      const original = editingTransaction;
      if (isGroupedTransaction(transactions, original)) {
        setScopeModal({
          isOpen: true,
          action: "edit",
          target: original,
          onConfirm: (scope) => {
            closeScopeModal();
            setConfirmModal({
              isOpen: true,
              title: "Confirmar Edição",
              message: (
                <RecurrenceEditSummary
                  original={original}
                  payload={payload}
                  affected={getTransactionsByScope(transactions, original, scope)}
                  accounts={accounts}
                  categories={categories}
                  paymentMethods={paymentMethods}
                  contacts={contacts}
                  currency={dashboardConfig.currency}
                />
              ),
              onConfirm: () => {
                setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                applyTransactionEdit(original, payload, scope);
              },
              variant: "info",
            });
          },
        });
      } else {
        await applyTransactionEdit(original, payload, "CURRENT");
      }
    } else {
      await dataService.createTransaction(currentUser.id, payload);
      // Balance is automatically recalculated by database trigger
      await fetchData(currentUser.ownerId || currentUser.id);
    }
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const applyTransactionEdit = async (
    editingTransaction: Transaction,
    payload: Omit<Transaction, "id"> & { recurrenceCount?: number },
    scope: RecurrenceScope,
  ) => {
    if (!currentUser) return;
    const affected = getTransactionsByScope(transactions, editingTransaction, scope);

    if (affected.some((t) => t.id === editingTransaction.id)) {
      const updatedTx = {
        ...payload,
        id: editingTransaction.id,
      } as Transaction;

      // Handle Parent-to-Child Status Sync
      const children = transactions.filter(t => t.parentId === editingTransaction.id);
      if (children.length > 0 && payload.status !== editingTransaction.status) {
        for (const child of children) {
          if (child.status !== payload.status) {
            const updatedChild = { ...child, status: payload.status };
            await dataService.updateTransaction(currentUser.id, updatedChild);
          }
        }
      }

      // Handle Child-to-Parent Status Sync
      if (editingTransaction.parentId) {
         const siblings = transactions.filter(t => t.parentId === editingTransaction.parentId && t.id !== editingTransaction.id);
         const allSiblingsPaid = siblings.every(s => s.status === "PAID");
         const parent = transactions.find(t => t.id === editingTransaction.parentId);
         
         if (parent) {
            if (payload.status === "PAID" && allSiblingsPaid) {
               // Calculate total paid by children (including the current one being saved)
               const totalPaidByChildren = siblings
                 .filter(s => s.status === "PAID")
                 .reduce((sum, s) => sum + s.amount, 0)
                 + (parseFloat(String(payload.amount)) || 0);

               if (totalPaidByChildren >= parent.amount - 0.01) {
               await dataService.updateTransaction(currentUser.id, { ...parent, status: "PAID" });
               }
            } else if (payload.status === "PENDING") {
               await dataService.updateTransaction(currentUser.id, { ...parent, status: "PENDING" });
            }
         }
      }

      await dataService.updateTransaction(currentUser.id, updatedTx);
    }

    // Propagate shared fields to the other records of the group.
    // Status/payment date stay per-record; only the day of month follows the edited one.
    const others = affected.filter((t) => t.id !== editingTransaction.id);
    if (others.length > 0) {
      const newDay = Number(payload.date.slice(8, 10));
      const dayChanged = payload.date.slice(8, 10) !== editingTransaction.date.slice(8, 10);
      await Promise.all(
        others.map((t) =>
          dataService.updateTransaction(currentUser.id, {
            ...t,
            description: payload.description,
            amount: payload.amount,
            type: payload.type,
            categoryId: payload.categoryId,
            accountId: payload.accountId,
            toAccountId: payload.toAccountId,
            paymentMethodId: payload.paymentMethodId,
            observation: payload.observation,
            contactId: payload.contactId,
            date: dayChanged ? applyDayOfMonth(t.date, newDay) : t.date,
          }),
        ),
      );
    }

    // Balance is automatically recalculated by database trigger
    await fetchData(currentUser.ownerId || currentUser.id);
  };

  const deleteTransactionsByScope = async (
    target: Transaction,
    scope: RecurrenceScope,
    force: boolean,
  ) => {
    if (!currentUser) return;
    const affected = getTransactionsByScope(transactions, target, scope);
    const ids = new Set(affected.map((t) => t.id));

    const hasExternalChildren = affected.some((t) =>
      transactions.some((c) => c.parentId === t.id && !ids.has(c.id)),
    );
    if (hasExternalChildren && !force) {
      setConfirmModal({
        isOpen: true,
        title: "Ações Necessárias",
        message: `Um ou mais lançamentos selecionados possuem baixas ou parcelas vinculadas. Exclua primeiro os lançamentos "filhos" para poder removê-los.`,
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, isOpen: false })),
        variant: "warning",
      });
      return;
    }

    const count = ids.size;
    setConfirmModal({
      isOpen: true,
      title: "Confirmar Exclusão",
      message: `Deseja realmente excluir ${count} ${count === 1 ? "lançamento" : "lançamentos"} de "${target.description}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          setLoadingData(true);
          // Balance is automatically recalculated by database trigger
          await dataService.deleteTransactions(currentUser.id, [...ids]);
          await fetchData(currentUser.ownerId || currentUser.id);
        } catch (error) {
          console.error("Erro ao excluir:", error);
          alert("Ocorreu um erro ao excluir os lançamentos.");
        } finally {
          setLoadingData(false);
        }
      },
      variant: "danger",
    });
  };

  const deleteTransaction = async (id: string, force: boolean = false) => {
    if (!currentUser) return;
    const target = transactions.find((t) => t.id === id);
    if (!target) return;

    if (isGroupedTransaction(transactions, target)) {
      setScopeModal({
        isOpen: true,
        action: "delete",
        target,
        onConfirm: (scope) => {
          closeScopeModal();
          deleteTransactionsByScope(target, scope, force);
        },
      });
      return;
    }

    const hasChildren = transactions.some((t) => t.parentId === id);
    if (hasChildren && !force) {
      setConfirmModal({
        isOpen: true,
        title: "Ações Necessárias",
        message: `Este lançamento possui baixas ou parcelas vinculadas. Exclua primeiro os lançamentos "filhos" para poder remover este lançamento pai.`,
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, isOpen: false })),
        variant: "warning",
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Confirmar Exclusão",
      message: `Deseja realmente excluir "${target.description}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          setLoadingData(true);
          // Balance is automatically recalculated by database trigger
          await dataService.deleteTransaction(currentUser.id, id);
          await fetchData(currentUser.ownerId || currentUser.id);
        } catch (error) {
          console.error("Erro ao excluir:", error);
          alert("Ocorreu um erro ao excluir o lançamento.");
        } finally {
          setLoadingData(false);
        }
      },
      variant: "danger",
    });
  };

  const handleResetData = async (deleteCategories: boolean) => {
    if (!currentUser) return;
    try {
      setLoadingData(true);
      await dataService.resetUserData(currentUser.id, deleteCategories);
      await fetchData(currentUser.ownerId || currentUser.id);
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
    file?: File,
  ) => {
    if (!currentUser) return;
    const parentTx = transactions.find((t) => t.id === id);
    if (!parentTx) return;

    let finalReceiptUrl = undefined;
    if (file) {
      const url = await dataService.uploadReceipt(currentUser.id, file);
      if (url) finalReceiptUrl = url;
    }

    const siblings = transactions.filter((t) => t.parentId === parentTx.id);
    const totalPaidBefore = siblings.reduce((acc, t) => acc + (t.status === "PAID" ? t.amount : 0), 0);

    const isFullAndFirst = (actualAmount >= parentTx.amount - 0.01) && siblings.length === 0;

    if (isFullAndFirst) {
      // Update parent directly
      const updatedParent = {
        ...parentTx,
        accountId: accountId,
        paymentDate: paymentDate,
        paymentMethodId: paymentMethodId || parentTx.paymentMethodId,
        tags: tags && tags.length > 0 ? tags : parentTx.tags,
        observation: observation || parentTx.observation,
        receiptUrl: finalReceiptUrl || parentTx.receiptUrl,
        status: "PAID" as const,
      };

      await dataService.updateTransaction(currentUser.id, updatedParent);
      
    } else {
      // Create child
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
        status: "PAID",
        paymentDate: paymentDate,
        date: paymentDate,
        description: description || `Baixa: ${parentTx.description}`,
        isRecurring: false,
      };

      await dataService.createTransaction(currentUser.id, childTx);

      const totalPaidAfter = totalPaidBefore + actualAmount;
      if (totalPaidAfter >= parentTx.amount - 0.01) {
        await dataService.updateTransaction(currentUser.id, {
          ...parentTx,
          status: "PAID",
        });
      }
    }
    // Balance is automatically recalculated by database trigger
    await fetchData(currentUser.ownerId || currentUser.id);
  };

  const handleToggleStatus = async (id: string) => {
    if (!currentUser) return;
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    setLoadingData(true);
    try {
      const newStatus = target.status === "PAID" ? "PENDING" : "PAID";

      // 1. If it's a parent, sync to all children
      const children = transactions.filter(t => t.parentId === id);
      if (children.length > 0) {
        for (const child of children) {
          if (child.status !== newStatus) {
            await dataService.updateTransaction(currentUser.id, { ...child, status: newStatus });
          }
        }
      }

      // 2. Update the target itself
      await dataService.updateTransaction(currentUser.id, { ...target, status: newStatus });

      // 3. If it's a child, sync to parent
      if (target.parentId) {
        const siblings = transactions.filter(t => t.parentId === target.parentId && t.id !== id);
        const allSiblingsPaid = siblings.every(s => s.status === "PAID");
        const parent = transactions.find(t => t.id === target.parentId);
        
        if (parent) {
          // Calculate total paid by children (including the current one being toggled)
          const totalPaidByChildren = siblings
            .filter(s => s.status === "PAID")
            .reduce((sum, s) => sum + s.amount, 0)
            + (newStatus === "PAID" ? target.amount : 0);

          if (newStatus === "PAID" && allSiblingsPaid && totalPaidByChildren >= parent.amount - 0.01) {
            await dataService.updateTransaction(currentUser.id, { ...parent, status: "PAID" });
          } else if (newStatus === "PENDING") {
            await dataService.updateTransaction(currentUser.id, { ...parent, status: "PENDING" });
          }
        }
      }

      // Balance is automatically recalculated by database trigger
    } catch (err) {
      console.error("Error toggling status:", err);
    } finally {
      await fetchData(currentUser.ownerId || currentUser.id);
      setLoadingData(false);
    }
  };

  const financialSummary: FinancialSummary = useMemo(() => {
    const rootTransactions = transactions.filter((t) => !t.parentId);
    
    const incomeRealized = rootTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((acc, t) => {
        const children = transactions.filter(c => c.parentId === t.id);
        if (children.length > 0) {
          return acc + children.reduce((sum, c) => sum + (c.status === "PAID" ? c.amount : 0), 0);
        }
        return acc + (t.status === "PAID" ? t.amount : 0);
      }, 0);

    const expenseRealized = rootTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((acc, t) => {
        const children = transactions.filter(c => c.parentId === t.id);
        if (children.length > 0) {
          return acc + children.reduce((sum, c) => sum + (c.status === "PAID" ? c.amount : 0), 0);
        }
        return acc + (t.status === "PAID" ? t.amount : 0);
      }, 0);

    const incomePending = rootTransactions
      .filter((t) => t.type === "INCOME" && t.status === "PENDING")
      .reduce((acc, t) => {
        const paid = transactions
          .filter((c) => c.parentId === t.id && c.status === "PAID")
          .reduce((sum, c) => sum + c.amount, 0);
        return acc + Math.max(0, t.amount - paid);
      }, 0);

    const expensePending = rootTransactions
      .filter((t) => t.type === "EXPENSE" && t.status === "PENDING")
      .reduce((acc, t) => {
        const paid = transactions
          .filter((c) => c.parentId === t.id && c.status === "PAID")
          .reduce((sum, c) => sum + c.amount, 0);
        return acc + Math.max(0, t.amount - paid);
      }, 0);

    return {
      totalBalance: accounts.reduce((acc, a) => acc + a.balance, 0),
      totalIncome: incomeRealized,
      totalExpense: expenseRealized,
      pendingIncome: incomePending,
      pendingExpense: expensePending,
    };
  }, [transactions, accounts]);
  // turbo - move hooks here
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    transactions.forEach((t) => t.tags?.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [transactions]);

  const handleAddAccount = async (data: Omit<Account, "id">) => {
    if (!currentUser) return;
    const result = await dataService.createAccount(currentUser.id, data);
    if (result) {
      await fetchData(currentUser.ownerId || currentUser.id);
    } else {
      alert(
        "Erro ao salvar conta. Verifique os logs do console para detalhes.",
      );
    }
  };

  const handleEditAccount = async (id: string, data: Omit<Account, "id">) => {
    if (!currentUser) return;
    const updatedAccount: Account = { ...data, id };
    await dataService.updateAccount(currentUser.id, updatedAccount);
    await fetchData(currentUser.ownerId || currentUser.id);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!currentUser) return;
    await dataService.deleteAccount(currentUser.id, id);
    await fetchData(currentUser.ownerId || currentUser.id);
  };

  const handleAddCategory = async (data: Omit<Category, "id">) => {
    if (!currentUser) return;
    const newCategory: Category = { ...data, id: crypto.randomUUID() };
    await dataService.createCategory(currentUser.id, newCategory);
    await fetchData(currentUser.ownerId || currentUser.id);
  };

  const handleEditCategory = async (id: string, data: Omit<Category, "id">) => {
    if (!currentUser) return;
    const updatedCategory: Category = { ...data, id };
    await dataService.updateCategory(currentUser.id, updatedCategory);
    await fetchData(currentUser.ownerId || currentUser.id);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!currentUser) return;
    await dataService.deleteCategory(currentUser.id, id);
    await fetchData(currentUser.ownerId || currentUser.id);
  };

  useEffect(() => {
    const handleOpenNew = () => handleOpenTransactionModal("EXPENSE");
    document.addEventListener("open-new-transaction", handleOpenNew);
    return () =>
      document.removeEventListener("open-new-transaction", handleOpenNew);
  }, []);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    await fetchData(user.ownerId || user.id);
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      setActiveView("ADMIN_DASHBOARD");
    } else {
      setActiveView("DASHBOARD");
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      // Clear local state
      setImpersonatedOriginalAdmin(null);
      setCurrentUser(null);
      setTransactions([]);
      setAccounts([]);
      setCategories([]);
      setActiveView("DASHBOARD");
      // Force reload to ensure clean memory and auth state
      window.location.reload();
    }
  };

  const handleAddPaymentMethod = async (name: string) => {
    if (!currentUser) return;
    await dataService.createPaymentMethod(currentUser.id, name);
    await fetchData(currentUser.ownerId || currentUser.id);
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (!currentUser) return;
    await dataService.deletePaymentMethod(currentUser.id, id);
    await fetchData(currentUser.ownerId || currentUser.id);
  };

  const handleDeleteDescriptionSuggestion = async (id: string) => {
    if (!currentUser) return;
    await dataService.deleteDescriptionSuggestion(currentUser.ownerId || currentUser.id, id);
    await fetchData(currentUser.ownerId || currentUser.id);
  };

  const handleRenameTag = async (oldTag: string, newTag: string) => {
    if (!currentUser) return;
    await dataService.renameTag(currentUser.id, oldTag, newTag);
    await fetchData(currentUser.ownerId || currentUser.id);
  };

  const handleDeleteTag = async (tag: string) => {
    if (!currentUser) return;
    await dataService.deleteTag(currentUser.id, tag);
    await fetchData(currentUser.ownerId || currentUser.id);
  };

  // ---- CONTACT HANDLERS ----
  type ContactFormData = Omit<Contact, 'id' | 'userId' | 'createdAt'>;

  const handleAddContact = async (data: ContactFormData) => {
    if (!currentUser) return { duplicateField: undefined };
    const result = await dataService.createContact(currentUser.ownerId || currentUser.id, data);
    if (!result.duplicateField) {
      await fetchData(currentUser.ownerId || currentUser.id);
    }
    return { duplicateField: result.duplicateField };
  };

  const handleEditContact = async (id: string, data: ContactFormData) => {
    if (!currentUser) return { duplicateField: undefined };
    const contact: Contact = {
      ...data,
      id,
      userId: currentUser.ownerId || currentUser.id,
      createdAt: new Date().toISOString(),
    };
    const result = await dataService.updateContact(currentUser.ownerId || currentUser.id, contact);
    if (result.ok) {
      await fetchData(currentUser.ownerId || currentUser.id);
    }
    return { duplicateField: result.duplicateField };
  };

  const handleDeleteContact = async (id: string) => {
    if (!currentUser) return;
    await dataService.deleteContact(currentUser.ownerId || currentUser.id, id);
    await fetchData(currentUser.ownerId || currentUser.id);
  };

  // Inline contact creation from TransactionModal autocomplete
  const handleCreateContactInline = async (_name: string, data: ContactFormData): Promise<Contact | null> => {
    if (!currentUser) return null;
    const result = await dataService.createContact(currentUser.ownerId || currentUser.id, data);
    if (result.data) {
      await fetchData(currentUser.ownerId || currentUser.id);
      return result.data;
    }
    return null;
  };

  // ---- LOAN HANDLERS ----
  const handleCreateLoan = async (payload: CreateLoanFormPayload) => {
    if (!currentUser) return;
    const effectiveId = currentUser.ownerId || currentUser.id;
    const result = await dataService.createLoan(effectiveId, payload);
    if (!result.ok) {
      throw new Error(result.error || "Não foi possível salvar o empréstimo.");
    }
    await fetchData(effectiveId);
  };

  const handleRegisterLoanPayment = async (
    loan: Loan,
    payload: RegisterLoanPaymentPayload,
  ) => {
    if (!currentUser) return;
    const effectiveId = currentUser.ownerId || currentUser.id;
    const result = await dataService.registerLoanPayment(effectiveId, loan, payload);
    if (!result.ok) {
      throw new Error(result.error || "Não foi possível registrar o pagamento.");
    }
    await fetchData(effectiveId);
  };

  const handleDeleteLoan = (loan: Loan) => {
    if (!currentUser) return;
    const effectiveId = currentUser.ownerId || currentUser.id;
    setConfirmModal({
      isOpen: true,
      title: "Excluir Empréstimo",
      message: `Deseja excluir o empréstimo de "${loan.borrowerName}" e todo o seu histórico de pagamentos? Lançamentos já registrados no fluxo de caixa não serão removidos automaticamente.`,
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        await dataService.deleteLoan(effectiveId, loan.id);
        await fetchData(effectiveId);
      },
    });
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

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <AuthScreen onLogin={handleLogin} />;
  const permissions = currentUser.activePermissions || DEFAULT_PERMISSIONS;

  const renderView = () => {
    switch (activeView) {
      case "DASHBOARD":
        return (
          <DashboardV2
            summary={financialSummary}
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            user={currentUser}
            onTransactionClick={(t) => {
              setActiveView("TRANSACTIONS");
              setEditingTransaction(t);
              setIsModalOpen(true);
            }}
            onOpenNewTransaction={(type) =>
              handleOpenTransactionModal(type || "EXPENSE")
            }
            onNavigateToTransactions={(start, end, highlightId) => {
              setTransactionViewFilters({ start, end, highlightId });
              setActiveView("TRANSACTIONS");
            }}
          />
        );
      // case 'DASHBOARD_V2': REMOVED
      case "TRANSACTIONS":
        return (
          <div className="h-full w-full">
            <TransactionList
              initialDateRange={transactionViewFilters}
              initialHighlightedId={transactionViewFilters?.highlightId}
              transactions={transactions}
              accounts={accounts}
              categories={categories}
              contacts={contacts}
              onDelete={deleteTransaction}
              onEdit={(t) => {
                setEditingTransaction(t);
                setIsModalOpen(true);
              }}
              onToggleStatus={handleToggleStatus}
              onSettleTransaction={handleSettleTransaction}
              paymentMethods={paymentMethods}
              availableTags={availableTags}
            />
          </div>
        );
      case "CONTACTS":
        return (
          <div className="w-full">
            <ContactManager
              contacts={contacts}
              onAdd={handleAddContact}
              onEdit={handleEditContact}
              onDelete={handleDeleteContact}
            />
          </div>
        );

      case "LOANS":
        return (
          <div className="w-full">
            <LoanManager
              loans={loans}
              contacts={contacts}
              accounts={accounts}
              categories={categories}
              paymentMethods={paymentMethods}
              currency={dashboardConfig.currency}
              onCreateLoan={handleCreateLoan}
              onRegisterPayment={handleRegisterLoanPayment}
              onDeleteLoan={handleDeleteLoan}
            />
          </div>
        );

      case "ACCOUNTS":
        return (
          <div className="w-full">
            <AccountList
              accounts={accounts}
              transactions={transactions}
              onAdd={handleAddAccount}
              onEdit={handleEditAccount}
              onDelete={handleDeleteAccount}
            />
          </div>
        );
      case "CATEGORIES":
        return (
          <div className="w-full">
            <CategoryManager
              categories={categories}
              onAdd={handleAddCategory}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
            />
          </div>
        );
      case "TAGS":
        return (
          <div className="w-full">
            <TagManager
              availableTags={availableTags}
              onRenameTag={handleRenameTag}
              onDeleteTag={handleDeleteTag}
            />
          </div>
        );
      case "REPORTS":
        return (
          permissions.viewReports && (
            <div className="w-full">
              <Reports
                transactions={transactions}
                categories={categories}
                user={currentUser}
              />
            </div>
          )
        );
      case "ADMIN_DASHBOARD":
        return (
          (currentUser.role === "ADMIN" ||
            currentUser.role === "SUPER_ADMIN") && (
            <div className="w-full">
              <AdminDashboard />
            </div>
          )
        );
      case "ADMIN":
      case "ADMIN_USERS":
        return (
          (currentUser.role === "ADMIN" ||
            currentUser.role === "SUPER_ADMIN") && (
            <div className="w-full">
              <AdminUsers
                currentUser={currentUser}
                onImpersonate={handleStartImpersonation}
              />
            </div>
          )
        );
      case "ADMIN_ACCOUNTS":
        return (
          (currentUser.role === "ADMIN" ||
            currentUser.role === "SUPER_ADMIN") && (
            <div className="w-full">
              <AdminAccounts />
            </div>
          )
        );
      case "ADMIN_PLANS":
        return (
          (currentUser.role === "ADMIN" ||
            currentUser.role === "SUPER_ADMIN") && (
            <div className="w-full">
              <AdminPlans />
            </div>
          )
        );
      case "ADMIN_PAYMENTS":
        return (
          (currentUser.role === "ADMIN" ||
            currentUser.role === "SUPER_ADMIN") && (
            <div className="w-full">
              <AdminPayments />
            </div>
          )
        );
      case "ADMIN_SETTINGS":
        return (
          (currentUser.role === "ADMIN" ||
            currentUser.role === "SUPER_ADMIN") && (
            <div className="w-full">
              <AdminSettings />
            </div>
          )
        );
      case "SETTINGS":
        return (
          permissions.viewSettings && (
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
              descriptionSuggestions={descriptionSuggestions}
              onDeleteDescriptionSuggestion={handleDeleteDescriptionSuggestion}
            />
          )
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50/50 font-sans text-gray-900 overflow-hidden">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[150] md:hidden backdrop-blur-sm animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR REESTRUTURADA (FLEXÍVEL) */}
      <aside
        className={`relative h-full bg-white border-r border-gray-100 transition-all duration-300 ease-out z-[100] ${isSidebarOpen ? "w-64" : "w-16"} shadow-lg shadow-gray-200/50 flex flex-col shrink-0 overflow-hidden md:flex`}
        onMouseEnter={() => !isSidebarPinned && setIsSidebarHovered(true)}
        onMouseLeave={() => !isSidebarPinned && setIsSidebarHovered(false)}
      >
        {/* LOGO / SISTEMA */}
        <div className="px-3 py-4 flex items-center justify-between border-b border-gray-100">
          <div
            className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${isSidebarOpen ? "flex-1" : "w-0 opacity-0 pointer-events-none"}`}
          >
            <div
              className={`w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 tracking-tight whitespace-nowrap">
                Finances IA
              </p>
              <p className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                Gestão Financeira
              </p>
            </div>
          </div>
          {/* Botão de toggle — sempre visível */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsSidebarPinned(!isSidebarPinned);
              setIsSidebarHovered(false);
            }}
            className={`p-1.5 rounded-md transition-all shrink-0 ${
              isSidebarPinned
                ? "text-blue-600 hover:bg-blue-50"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
            title={isSidebarPinned ? "Retrair menu" : "Fixar menu"}
            type="button"
            aria-label={isSidebarPinned ? "Retrair menu" : "Fixar menu"}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${!isSidebarPinned ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        {/* PERFIL DO USUÁRIO */}
        <div
          onClick={() => handleNavClick("SETTINGS")}
          className={`mx-3 mt-4 p-3 rounded-xl transition-all cursor-pointer ${activeView === "SETTINGS" ? "bg-blue-50 border border-blue-100" : "hover:bg-gray-50 border border-transparent"} group`}
        >
          <div
            className={`flex items-center ${!isSidebarOpen ? "justify-center" : "gap-3"}`}
          >
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-white shadow-md transition-transform group-hover:scale-105`}
            >
              {currentUser.photoUrl ? (
                <img
                  src={currentUser.photoUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-sm">
                  {currentUser.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden animate-fade-in min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {currentUser.email}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${currentUser.accountType === "BUSINESS" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"}`}
                  >
                    {currentUser.accountType === "BUSINESS"
                      ? "Empresa"
                      : "Pessoal"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* NAVEGAÇÃO PRINCIPAL */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-4">
          {/* MENUS PARA ADMIN */}
          {currentUser.role === "ADMIN" ||
          currentUser.role === "SUPER_ADMIN" ? (
            <>
              {[
                {
                  view: "ADMIN_DASHBOARD",
                  label: "Estatísticas",
                  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
                },
                {
                  view: "ADMIN_USERS",
                  label: "Usuários",
                  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
                },
                {
                  view: "ADMIN_PLANS",
                  label: "Planos",
                  icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 013.138-3.138z",
                },
                {
                  view: "ADMIN_PAYMENTS",
                  label: "Pagamentos",
                  icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
                },
                {
                  view: "ADMIN_SETTINGS",
                  label: "Sistema",
                  icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
                },
              ].map((item) => (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view as ViewState)}
                  className={`group flex items-center ${!isSidebarOpen ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg transition-all duration-200 w-full ${activeView === item.view ? "bg-emerald-50 text-emerald-600" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
                >
                  <svg
                    className="w-5 h-5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={item.icon}
                    />
                  </svg>
                  {isSidebarOpen && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </button>
              ))}
            </>
          ) : (
            /* MENUS PARA USUÁRIOS NORMAIS */
            <>
              {[
                {
                  view: "DASHBOARD",
                  label: "Dashboard",
                  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
                },
                {
                  view: "TRANSACTIONS",
                  label: "Lançamentos",
                  icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
                },
                {
                  view: "ACCOUNTS",
                  label: "Contas",
                  icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
                },
                {
                  view: "CATEGORIES",
                  label: "Categorias",
                  icon: "M7 7h.01M7 11h.01M7 15h.01M11 7h8M11 11h8M11 15h8",
                },
                {
                  view: "TAGS",
                  label: "Tags",
                  icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
                },
                {
                  view: "CONTACTS",
                  label: "Contatos",
                  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
                },
                {
                  view: "LOANS",
                  label: "Empréstimos",
                  icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                },
                ...(permissions.viewReports
                  ? [
                      {
                        view: "REPORTS",
                        label: "Relatórios",
                        icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
                      },
                    ]
                  : []),
              ].map((item) => (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view as ViewState)}
                  className={`group flex items-center ${!isSidebarOpen ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg transition-all duration-200 w-full ${activeView === item.view ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
                >
                  <svg
                    className="w-5 h-5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={item.icon}
                    />
                  </svg>
                  {isSidebarOpen && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </button>
              ))}
            </>
          )}
        </nav>

        {/* BOTTOM MENU (CONFIG & SAIR) */}
        <div className="p-3 border-t border-gray-100 space-y-1">
          {permissions.viewSettings && (
            <button
              onClick={() => handleNavClick("SETTINGS")}
              className={`w-full flex items-center ${!isSidebarOpen ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg transition-all duration-200 group ${activeView === "SETTINGS" ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.99l1.005.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              {isSidebarOpen && <span className="text-sm font-medium">Configurações</span>}
            </button>
          )}

          {impersonatedOriginalAdmin && (
            <button
              onClick={handleStopImpersonation}
              className={`w-full flex items-center ${!isSidebarOpen ? "justify-center" : "gap-3"} text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2.5 rounded-lg transition-all duration-200 group font-bold text-xs`}
              title="Voltar para conta de Administrador"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
              </svg>
              {isSidebarOpen && <span>Voltar ao Admin</span>}
            </button>
          )}

          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${!isSidebarOpen ? "justify-center" : "gap-3"} text-gray-400 hover:text-red-500 hover:bg-red-50 px-3 py-2.5 rounded-lg transition-all duration-200 group`}
          >
            <svg
              className="w-5 h-5 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            {isSidebarOpen && <span className="text-sm font-medium">Sair</span>}
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 relative overflow-y-auto bg-gray-50/30 scroll-smooth flex flex-col">
        {/* BANNER DE ACESSO ADMINISTRATIVO (IMPERSONATION) */}
        {impersonatedOriginalAdmin && currentUser && (
          <ImpersonationBanner
            user={currentUser}
            admin={impersonatedOriginalAdmin}
            onExit={handleStopImpersonation}
          />
        )}

        {/* HEADER MOBILE */}
        <header className="md:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <span className="font-bold text-gray-800 tracking-tight">
              Finances IA
            </span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2.5 bg-gray-50 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
          </button>
        </header>
        {currentUser && currentUser.paymentStatus === "SUSPENDED" && (
          <SuspensionBanner user={currentUser} />
        )}
        {currentUser && <SubscriptionAlert user={currentUser} />}

        <div
          className={`flex-1 w-full max-w-[1600px] mx-auto relative ${activeView === "TRANSACTIONS" ? "overflow-hidden pt-0 pb-0 px-0" : "overflow-y-auto pt-8 pb-20 px-4 sm:px-6 lg:px-8"}`}
        >
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

      {/* WALL DE PAGAMENTO */}
      {currentUser && !impersonatedOriginalAdmin && (
        <PaymentWall
          user={currentUser}
          onSimulatePayment={() =>
            handlePaymentSimulation(currentUser).then((updated) => {
              setCurrentUser(updated);
              // Force reload or data fetch could go here
              alert("Pagamento simulado com sucesso! Acesso liberado.");
            })
          }
        />
      )}

      {/* MODAL DE TRANSAÃ‡ÃƒO (EXPANSÍVEL) */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        accounts={accounts}
        categories={categories}
        paymentMethods={paymentMethods}
        contacts={contacts}
        initialData={editingTransaction}
        initialType={modalInitialType}
        currency={dashboardConfig.currency}
        availableTags={availableTags}
        descriptionSuggestions={descriptionSuggestions}
        onSubmit={handleSaveTransaction}
        onCreateContact={handleCreateContactInline}
      />

      {/* MODAL DE CONFIRMAÃ‡ÃƒO */}
      <RecurrenceScopeModal
        isOpen={scopeModal.isOpen}
        action={scopeModal.action}
        target={scopeModal.target}
        transactions={transactions}
        onConfirm={scopeModal.onConfirm}
        onCancel={closeScopeModal}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        variant={confirmModal.variant}
        confirmLabel={
          confirmModal.variant === "warning" ? "Entendido" : "Confirmar"
        }
      />
    </div>
  );
}
