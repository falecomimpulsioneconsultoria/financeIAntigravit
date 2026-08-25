import { supabase } from '../lib/supabaseClient';
import {
  User, Account, Category, Transaction, FinancialSummary,
  PaymentMethod, Plan
} from '../types';
import { authService } from './authService';

const checkReadOnly = () => {
  const user = authService.getCurrentUser();
  if (user && user.role === 'USER') {
    const isOverdue = user.paymentStatus === 'OVERDUE' || new Date(user.expirationDate).getTime() < new Date().getTime();
    if (isOverdue) {
      alert("Acesso Restrito: Você está no modo somente leitura. Regularize sua assinatura para fazer alterações nos dados.");
      throw new Error("Acesso Restrito (Somente Leitura).");
    }
  }
};

export const dataService = {
  // --- TRANSACTIONS ---
  getTransactions: async (userId: string): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching transactions:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((t: any) => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      date: t.date,
      paymentDate: t.payment_date,
      type: t.type,
      categoryId: t.category_id,
      accountId: t.account_id,
      toAccountId: t.to_account_id,
      paymentMethodId: t.payment_method_id,
      status: t.status,
      observation: t.observation,
      tags: t.tags,
      receiptUrl: t.receipt_url,
      groupId: t.group_id,
      isRecurring: t.is_recurring,
      recurringType: t.recurring_type,
      installmentCurrent: t.installment_current,
      installmentTotal: t.installment_total,
      parentId: t.parent_id
    }));
  },

  createTransaction: async (userId: string, transaction: any): Promise<Transaction | null> => {
    checkReadOnly();
    const dbPayload = {
      id: transaction.id || crypto.randomUUID(),
      user_id: userId,
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date,
      payment_date: transaction.paymentDate,
      type: transaction.type,
      status: transaction.status,
      category_id: transaction.categoryId,
      account_id: transaction.accountId,
      to_account_id: transaction.toAccountId,
      payment_method_id: transaction.paymentMethodId,
      observation: transaction.observation,
      tags: transaction.tags,
      receipt_url: transaction.receiptUrl,
      group_id: transaction.groupId,
      is_recurring: transaction.isRecurring,
      recurring_type: transaction.recurringType,
      installment_current: transaction.installmentCurrent,
      installment_total: transaction.installmentTotal,
      parent_id: transaction.parentId
    };

    // HANDLE RECURRENCE / INSTALLMENTS
    if (transaction.isRecurring && !transaction.groupId) { // Only if not already part of a group (avoid recursion if passed)
      const groupId = crypto.randomUUID();
      const mainTransactionId = dbPayload.id;

      if (transaction.recurringType === 'INSTALLMENT' && transaction.recurrenceCount && transaction.recurrenceCount > 1) {
        const installmentValue = Number((transaction.amount / transaction.recurrenceCount).toFixed(2));
        // Adjust first installment to match total exactly if round issues
        const totalCalculated = installmentValue * transaction.recurrenceCount;
        const diff = Number((transaction.amount - totalCalculated).toFixed(2));

        const transactionsToInsert = [];

        for (let i = 0; i < transaction.recurrenceCount; i++) {
          const dateObj = new Date(transaction.date);
          dateObj.setMonth(dateObj.getMonth() + i); // Add months
          const dateStr = dateObj.toISOString().split('T')[0];

          const value = i === 0 ? installmentValue + diff : installmentValue;

          transactionsToInsert.push({
            ...dbPayload,
            id: i === 0 ? mainTransactionId : crypto.randomUUID(), // Keep main ID for first
            date: dateStr,
            amount: value,
            group_id: groupId,
            installment_current: i + 1,
            installment_total: transaction.recurrenceCount,
            status: i === 0 ? dbPayload.status : 'PENDING'
          });
        }

        const { error } = await supabase.from('transactions').insert(transactionsToInsert);
        if (error) { console.error('Error creating installments:', error); return null; }
        return { ...transaction, id: mainTransactionId };

      } else if (transaction.recurringType === 'FIXED') {
        // Create for next 12 months
        const transactionsToInsert = [];
        for (let i = 0; i < 12; i++) {
          const dateObj = new Date(transaction.date);
          dateObj.setMonth(dateObj.getMonth() + i);
          const dateStr = dateObj.toISOString().split('T')[0];

          transactionsToInsert.push({
            ...dbPayload,
            id: i === 0 ? mainTransactionId : crypto.randomUUID(),
            date: dateStr,
            group_id: groupId,
            is_recurring: true,
            status: i === 0 ? dbPayload.status : 'PENDING'
          });
        }
        const { error } = await supabase.from('transactions').insert(transactionsToInsert);
        if (error) { console.error('Error creating fixed recurrence:', error); return null; }
        return { ...transaction, id: mainTransactionId };
      }
    }

    // NORMAL SINGLE INSERT

    const { error } = await supabase
      .from('transactions')
      .insert([dbPayload]);

    if (error) {
      console.error('Error creating transaction:', error.message);
      return null;
    }
    return transaction;
  },

  renameTag: async (userId: string, oldTag: string, newTag: string): Promise<void> => {
    checkReadOnly();
    // Select transactions that contain the old tag
    const { data, error } = await supabase.from('transactions').select('id, tags').eq('user_id', userId).contains('tags', [oldTag]);
    if (error || !data) return;
    
    // Process sequentially (could use Promise.all for speed, but sequentially is safer for now)
    for (const t of data) {
        if (!t.tags) continue;
        const updatedTags = t.tags.map((tag: string) => tag.toLowerCase() === oldTag.toLowerCase() ? newTag : tag);
        // avoid duplicates if newTag was already there
        const uniqueTags = Array.from(new Set(updatedTags));
        await supabase.from('transactions').update({ tags: uniqueTags }).eq('id', t.id);
    }
  },

  deleteTag: async (userId: string, tagToDelete: string): Promise<void> => {
    checkReadOnly();
    const { data, error } = await supabase.from('transactions').select('id, tags').eq('user_id', userId).contains('tags', [tagToDelete]);
    if (error || !data) return;
    
    for (const t of data) {
        if (!t.tags) continue;
        const updatedTags = t.tags.filter((tag: string) => tag.toLowerCase() !== tagToDelete.toLowerCase());
        await supabase.from('transactions').update({ tags: updatedTags }).eq('id', t.id);
    }
  },

  updateTransaction: async (userId: string, transaction: Transaction): Promise<void> => {
    checkReadOnly();
    const dbPayload = {
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date,
      payment_date: transaction.paymentDate,
      type: transaction.type,
      status: transaction.status,
      category_id: transaction.categoryId,
      account_id: transaction.accountId,
      to_account_id: transaction.toAccountId,
      payment_method_id: transaction.paymentMethodId,
      observation: transaction.observation,
      is_recurring: transaction.isRecurring,
      recurring_type: transaction.recurringType,
      parent_id: transaction.parentId
    };

    const { error } = await supabase
      .from('transactions')
      .update(dbPayload)
      .eq('id', transaction.id)
      .eq('user_id', userId);

    if (error) console.error('Error updating transaction:', error.message);
  },

  deleteTransaction: async (userId: string, id: string): Promise<void> => {
    checkReadOnly();
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting transaction:', error.message);
      throw error;
    }
  },

  // --- ACCOUNTS ---
  getAccounts: async (userId: string): Promise<Account[]> => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching accounts:', error.message);
      return [];
    }
    return (data || []).map((acc: any) => ({
      ...acc,
      type: acc.type || 'CHECKING'
    }));
  },

  createAccount: async (userId: string, account: Omit<Account, 'id'>): Promise<Account | null> => {
    checkReadOnly();
    const payload: any = {
      user_id: userId,
      name: account.name,
      balance: account.balance,
      initial_balance: account.balance,
      color: account.color,
      type: account.type || 'CHECKING'
    };

    const { data, error } = await supabase
      .from('accounts')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error creating account:', error.message);
      return null;
    }
    return data;
  },

  updateAccount: async (userId: string, account: Account): Promise<void> => {
    checkReadOnly();
    // Do NOT include balance here — it's managed by the database trigger
    const payload: any = {
      name: account.name,
      color: account.color,
      type: account.type
    };

    const { error } = await supabase
      .from('accounts')
      .update(payload)
      .eq('id', account.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating account:', error.message);
    }
  },

  // updateAccountBalance removed — balance is now managed by the database trigger
  // (tr_recalculate_balance) automatically on every transaction change.

  deleteAccount: async (userId: string, id: string): Promise<void> => {
    checkReadOnly();
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) console.error('Error deleting account:', error.message);
  },

  // --- CATEGORIES ---
  getCategories: async (userId: string): Promise<Category[]> => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching categories:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((c: any) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      color: c.color,
      parentId: c.parent_id,
      dreCategory: c.dre_category,
      budgetLimit: c.budget_limit
    }));
  },

  createCategory: async (userId: string, category: Category): Promise<Category | null> => {
    checkReadOnly();
    const { error } = await supabase
      .from('categories')
      .insert([{
        id: category.id,
        user_id: userId,
        name: category.name,
        type: category.type,
        color: category.color,
        parent_id: category.parentId,
        dre_category: category.dreCategory,
        budget_limit: category.budgetLimit
      }]);

    if (error) {
      console.error('Error creating category:', error.message);
      return null;
    }
    return category;
  },

  createCategoriesBatch: async (userId: string, categoriesTree: any[]): Promise<void> => {
    checkReadOnly();
    for (const parent of categoriesTree) {
      const parentId = crypto.randomUUID();

      const { error: pErr } = await supabase.from('categories').insert([{
        id: parentId,
        user_id: userId,
        name: parent.name,
        type: parent.type,
        color: parent.color,
        dre_category: parent.dreCategory,
        parent_id: null,
        budget_limit: 0
      }]);

      if (pErr) continue;

      if (parent.subcategories && parent.subcategories.length > 0) {
        const children = parent.subcategories.map((child: any) => ({
          id: crypto.randomUUID(),
          user_id: userId,
          name: child.name,
          type: child.type,
          color: child.color,
          dre_category: child.dreCategory,
          parent_id: parentId,
          budget_limit: 0
        }));
        await supabase.from('categories').insert(children);
      }
    }
  },

  updateCategory: async (userId: string, category: Category): Promise<void> => {
    checkReadOnly();
    const { error } = await supabase
      .from('categories')
      .update({
        name: category.name,
        type: category.type,
        color: category.color,
        parent_id: category.parentId,
        dre_category: category.dreCategory,
        budget_limit: category.budgetLimit
      })
      .eq('id', category.id)
      .eq('user_id', userId);

    if (error) console.error('Error updating category:', error.message);
  },

  deleteCategory: async (userId: string, id: string): Promise<void> => {
    checkReadOnly();
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) console.error('Error deleting category:', error.message);
  },

  getPaymentMethods: async (userId: string): Promise<PaymentMethod[]> => {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId);

    if (error) return [];
    return data || [];
  },

  createPaymentMethod: async (userId: string, name: string): Promise<PaymentMethod | null> => {
    checkReadOnly();
    const { data, error } = await supabase
      .from('payment_methods')
      .insert([{ user_id: userId, name }])
      .select()
      .single();

    if (error) {
      console.error('Error creating payment method:', error.message);
      return null;
    }
    return data;
  },

  deletePaymentMethod: async (userId: string, id: string): Promise<void> => {
    checkReadOnly();
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) console.error('Error deleting payment method:', error.message);
  },

  // Admin: Get all accounts from all users
  getAllAccountsForAdmin: async (): Promise<any[]> => {
    const { data, error } = await supabase
      .from('accounts')
      .select(`
  *,
  profiles: user_id(name, email, account_type)
    `);

    if (error) {
      console.error('Error fetching all accounts:', error.message);
      return [];
    }
    return data || [];
  },

  getAllTransactionsForAdmin: async (limit = 50): Promise<any[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        profiles: user_id(name, email)
      `)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching all transactions:', error.message);
      return [];
    }
    return data || [];
  },


  resetUserData: async (userId: string, deleteCategories: boolean): Promise<void> => {
    checkReadOnly();
    await supabase.from('transactions').delete().eq('user_id', userId);
    await supabase.from('accounts').update({ balance: 0, initial_balance: 0 }).eq('user_id', userId);
    if (deleteCategories) {
      await supabase.from('categories').delete().eq('user_id', userId);
    }
  },
  uploadReceipt: async (userId: string, file: File): Promise<string | null> => {
    checkReadOnly();
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading receipt:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Upload exception:', error);
      return null;
    }
  },
  // --- PLANS ---
  getPlans: async (): Promise<Plan[]> => {
    const { data, error } = await supabase.from('plans').select('*');
    if (error) return [];
    return data || [];
  }
};
