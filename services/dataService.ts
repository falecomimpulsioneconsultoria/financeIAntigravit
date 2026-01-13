
import { supabase } from '../lib/supabaseClient';
import { Transaction, Account, Category, PaymentMethod } from '../types';

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
      isRecurring: t.is_recurring,
      recurringType: t.recurring_type,
      installmentCurrent: t.installment_current,
      installmentTotal: t.installment_total,
      parentId: t.parent_id
    }));
  },

  createTransaction: async (userId: string, transaction: any): Promise<Transaction | null> => {
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
      is_recurring: transaction.isRecurring,
      recurring_type: transaction.recurringType,
      installment_current: transaction.installmentCurrent,
      installment_total: transaction.installmentTotal,
      parent_id: transaction.parentId
    };

    const { error } = await supabase
      .from('transactions')
      .insert([dbPayload]);

    if (error) {
      console.error('Error creating transaction:', error.message);
      return null;
    }
    return transaction;
  },

  updateTransaction: async (userId: string, transaction: Transaction): Promise<void> => {
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
    const payload: any = {
      user_id: userId,
      name: account.name,
      balance: account.balance,
      color: account.color,
      type: account.type || 'CHECKING'
    };

    const { data, error } = await supabase
      .from('accounts')
      .insert([payload])
      .select()
      .single();

    if (error) {
      const errorMsg = error.message || "";
      // Fallback para quando a coluna 'type' ainda não está disponível no cache do Supabase
      if (errorMsg.includes("column \"type\"") || 
          errorMsg.includes("Could not find the 'type' column") || 
          error.code === '42703') {
        
        console.warn("Aviso: Tentando salvar conta sem a coluna 'type' devido a erro de esquema no banco.");
        
        const { type, ...legacyPayload } = payload;
        const { data: lData, error: lError } = await supabase
          .from('accounts')
          .insert([legacyPayload])
          .select()
          .single();

        if (lError) {
          console.error('Final failure creating account:', lError.message);
          return null;
        }
        return lData;
      }

      console.error('Error creating account:', errorMsg);
      return null;
    }
    return data;
  },

  updateAccount: async (userId: string, account: Account): Promise<void> => {
    const payload: any = {
      name: account.name,
      balance: account.balance,
      color: account.color,
      type: account.type
    };

    const { error } = await supabase
      .from('accounts')
      .update(payload)
      .eq('id', account.id)
      .eq('user_id', userId);

    if (error) {
        if (error.message.includes("column \"type\"") || error.code === '42703') {
            const { type, ...legacyPayload } = payload;
            await supabase.from('accounts').update(legacyPayload).eq('id', account.id).eq('user_id', userId);
        } else {
            console.error('Error updating account:', error.message);
        }
    }
  },

  updateAccountBalance: async (userId: string, accountId: string, newBalance: number): Promise<void> => {
    const { error } = await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', accountId)
      .eq('user_id', userId);
      
    if (error) console.error('Error updating balance:', error.message);
  },

  deleteAccount: async (userId: string, id: string): Promise<void> => {
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

  resetUserData: async (userId: string, deleteCategories: boolean): Promise<void> => {
    await supabase.from('transactions').delete().eq('user_id', userId);
    await supabase.from('accounts').update({ balance: 0 }).eq('user_id', userId);
    if (deleteCategories) {
      await supabase.from('categories').delete().eq('user_id', userId);
    }
  }
};
