import { supabase } from '../lib/supabaseClient';
import {
  User, Account, Category, Transaction, FinancialSummary,
  InvestmentAsset, InvestmentType, InvestmentTransaction, PaymentMethod, Plan
} from '../types';

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
            // For installments, usually only the processed one is paid? Or all if credit card?
            // Usually user launches "Credit Card Bill" or individual expenses. 
            // Let's assume user input status applies to all or logic handles it. 
            // For 'PENDING', all pending.
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
            is_recurring: true
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
      console.error('Error creating account:', error.message);
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
      console.error('Error updating account:', error.message);
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

  createPaymentMethod: async (userId: string, name: string): Promise<PaymentMethod | null> => {
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

  // --- INVESTMENTS ---
  getAssets: async (userId: string): Promise<any[]> => {
    const { data, error } = await supabase
      .from('investment_assets')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching assets:', error.message);
      return [];
    }
    return data?.map(a => ({
      id: a.id,
      userId: a.user_id,
      ticker: a.ticker,
      name: a.name,
      type: a.type,
      currentPrice: a.current_price,
      quantity: a.quantity,
      averagePrice: a.average_price,
    })) || [];
  },

  createAsset: async (userId: string, asset: any): Promise<any | null> => {
    const { data, error } = await supabase
      .from('investment_assets')
      .insert([{
        user_id: userId,
        ticker: asset.ticker,
        name: asset.name,
        type: asset.type,
        current_price: asset.currentPrice,
        quantity: 0,
        average_price: 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating asset:', error.message);
      return null;
    }
    return {
      id: data.id,
      userId: data.user_id,
      ticker: data.ticker,
      name: data.name,
      type: data.type,
      currentPrice: data.current_price,
      quantity: data.quantity,
      averagePrice: data.average_price,
    };
  },

  addInvestmentTransaction: async (userId: string, transaction: any): Promise<boolean> => {
    // 1. Insert Transaction
    const { error: txError } = await supabase
      .from('investment_transactions')
      .insert([{
        asset_id: transaction.assetId,
        user_id: userId,
        type: transaction.type,
        quantity: transaction.quantity || 0, // Dividends might have 0 quantity
        price: transaction.price || 0,
        total_amount: transaction.totalAmount,
        date: transaction.date,
        fees: transaction.fees || 0
      }]);

    if (txError) {
      console.error('Error adding investment transaction:', txError.message);
      return false;
    }

    // 2. Update Asset (Quantity & Avg Price) - ONLY FOR BUY/SELL
    if (transaction.type === 'DIVIDEND' || transaction.type === 'JCP') {
      return true; // Earnings don't change position
    }

    // Fetch current asset state
    const { data: asset } = await supabase.from('investment_assets').select('*').eq('id', transaction.assetId).single();
    if (!asset) return true;

    let newQuantity = Number(asset.quantity);
    let newAvgPrice = Number(asset.average_price);

    if (transaction.type === 'BUY') {
      const totalCostOld = newQuantity * newAvgPrice;
      const totalCostNew = Number(transaction.totalAmount) + (transaction.fees || 0);
      newQuantity += Number(transaction.quantity);
      if (newQuantity > 0) {
        newAvgPrice = (totalCostOld + totalCostNew) / newQuantity;
      }
    } else if (transaction.type === 'SELL') {
      newQuantity -= Number(transaction.quantity);
      // Sell doesn't change avg price usually
    }

    await supabase.from('investment_assets').update({
      quantity: newQuantity,
      average_price: newAvgPrice
    }).eq('id', transaction.assetId);

    return true;
  },

  getInvestmentTransactions: async (userId: string): Promise<InvestmentTransaction[]> => {
    const { data, error } = await supabase
      .from('investment_transactions')
      .select(`
    *,
    asset: asset_id(ticker, name)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching investment transactions:', error.message);
      return [];
    }

    return (data || []).map((t: any) => ({
      id: t.id,
      assetId: t.asset_id,
      userId: t.user_id,
      type: t.type,
      quantity: t.quantity,
      price: t.price,
      totalAmount: t.total_amount,
      date: t.date,
      fees: t.fees
    }));
  },

  resetUserData: async (userId: string, deleteCategories: boolean): Promise<void> => {
    await supabase.from('transactions').delete().eq('user_id', userId);
    await supabase.from('accounts').update({ balance: 0 }).eq('user_id', userId);
    if (deleteCategories) {
      await supabase.from('categories').delete().eq('user_id', userId);
    }
  },
  uploadReceipt: async (userId: string, file: File): Promise<string | null> => {
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
