import { supabase } from '../lib/supabaseClient';
import {
  User, Account, Category, Transaction, FinancialSummary,
  PaymentMethod, Plan, Contact, Loan, LoanPayment, LoanLateFeeType, LoanPaymentType
} from '../types';
import { authService } from './authService';
import {
  addDaysISO,
  formatCurrencyBRL,
  LOAN_PAYMENT_TYPE_LABELS,
  roundMoney,
  simulateLoanPayment,
} from './loanCalculator';


const checkReadOnly = () => {
  if (authService.isImpersonating()) {
    return;
  }
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
      parentId: t.parent_id,
      contactId: t.contact_id ?? undefined,
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
      parent_id: transaction.parentId,
      contact_id: transaction.contactId ?? null,
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
      parent_id: transaction.parentId,
      contact_id: transaction.contactId ?? null,
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

  deleteTransactions: async (userId: string, ids: string[]): Promise<void> => {
    checkReadOnly();
    if (ids.length === 0) return;
    const { error } = await supabase
      .from('transactions')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting transactions:', error.message);
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
  },

  // =====================================================
  // --- CONTACTS (Pessoas / Fornecedores) ---
  // =====================================================

  getContacts: async (userId: string): Promise<Contact[]> => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('fantasy_name', { ascending: true });

    if (error) {
      console.error('Error fetching contacts:', error.message);
      return [];
    }

    return (data || []).map((c: any) => ({
      id: c.id,
      userId: c.user_id,
      fantasyName: c.fantasy_name,
      legalName: c.legal_name ?? undefined,
      personType: c.person_type ?? 'FISICA',
      cpfCnpj: c.cpf_cnpj ?? undefined,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      whatsapp: c.whatsapp ?? undefined,
      mobile: c.mobile ?? undefined,
      labels: c.labels ?? [],
      isActive: c.is_active ?? true,
      createdAt: c.created_at,
    }));
  },

  // Check for duplicates: returns field name that is duplicated, or null
  checkContactDuplicate: async (
    userId: string,
    fields: { cpfCnpj?: string; email?: string; phone?: string },
    excludeId?: string
  ): Promise<string | null> => {
    const checks: { field: string; column: string; value: string }[] = [];

    if (fields.cpfCnpj?.trim()) {
      const cleaned = fields.cpfCnpj.replace(/\D/g, '');
      if (cleaned) checks.push({ field: 'CPF/CNPJ', column: 'cpf_cnpj', value: fields.cpfCnpj.trim() });
    }
    if (fields.email?.trim()) {
      checks.push({ field: 'E-mail', column: 'email', value: fields.email.trim().toLowerCase() });
    }
    if (fields.phone?.trim()) {
      checks.push({ field: 'Telefone', column: 'phone', value: fields.phone.trim() });
    }

    for (const check of checks) {
      let query = supabase
        .from('contacts')
        .select('id')
        .eq('user_id', userId)
        .eq(check.column, check.value);

      if (excludeId) query = query.neq('id', excludeId);

      const { data } = await query.limit(1);
      if (data && data.length > 0) return check.field;
    }

    return null;
  },

  createContact: async (userId: string, contact: Omit<Contact, 'id' | 'userId' | 'createdAt'>): Promise<{ data: Contact | null; duplicateField?: string }> => {
    checkReadOnly();

    const duplicate = await dataService.checkContactDuplicate(userId, {
      cpfCnpj: contact.cpfCnpj,
      email: contact.email,
      phone: contact.phone,
    });

    if (duplicate) return { data: null, duplicateField: duplicate };

    const { data, error } = await supabase
      .from('contacts')
      .insert([{
        user_id: userId,
        fantasy_name: contact.fantasyName,
        legal_name: contact.legalName || null,
        person_type: contact.personType,
        cpf_cnpj: contact.cpfCnpj || null,
        email: contact.email ? contact.email.toLowerCase() : null,
        phone: contact.phone || null,
        whatsapp: contact.whatsapp || null,
        mobile: contact.mobile || null,
        labels: contact.labels,
        is_active: contact.isActive,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating contact:', error.message);
      return { data: null };
    }

    return {
      data: {
        id: data.id,
        userId: data.user_id,
        fantasyName: data.fantasy_name,
        legalName: data.legal_name ?? undefined,
        personType: data.person_type,
        cpfCnpj: data.cpf_cnpj ?? undefined,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        whatsapp: data.whatsapp ?? undefined,
        mobile: data.mobile ?? undefined,
        labels: data.labels ?? [],
        isActive: data.is_active,
        createdAt: data.created_at,
      },
    };
  },

  updateContact: async (userId: string, contact: Contact): Promise<{ ok: boolean; duplicateField?: string }> => {
    checkReadOnly();

    const duplicate = await dataService.checkContactDuplicate(userId, {
      cpfCnpj: contact.cpfCnpj,
      email: contact.email,
      phone: contact.phone,
    }, contact.id);

    if (duplicate) return { ok: false, duplicateField: duplicate };

    const { error } = await supabase
      .from('contacts')
      .update({
        fantasy_name: contact.fantasyName,
        legal_name: contact.legalName || null,
        person_type: contact.personType,
        cpf_cnpj: contact.cpfCnpj || null,
        email: contact.email ? contact.email.toLowerCase() : null,
        phone: contact.phone || null,
        whatsapp: contact.whatsapp || null,
        mobile: contact.mobile || null,
        labels: contact.labels,
        is_active: contact.isActive,
      })
      .eq('id', contact.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating contact:', error.message);
      return { ok: false };
    }

    return { ok: true };
  },

  deleteContact: async (userId: string, id: string): Promise<void> => {
    checkReadOnly();
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) console.error('Error deleting contact:', error.message);
  },

  // --- DESCRIPTION SUGGESTIONS ---
  getDescriptionSuggestions: async (userId: string): Promise<any[]> => {
    const { data, error } = await supabase
      .from('description_suggestions')
      .select('id, text')
      .eq('user_id', userId)
      .order('text', { ascending: true });

    if (error) {
      console.error('Error fetching description suggestions:', error.message);
      return [];
    }

    return data || [];
  },

  addDescriptionSuggestion: async (userId: string, text: string): Promise<void> => {
    checkReadOnly();
    
    // Evitar duplicidade exata no lado do cliente
    const existing = await dataService.getDescriptionSuggestions(userId);
    if (existing.some(s => s.text.toLowerCase() === text.toLowerCase())) return;

    const { error } = await supabase
      .from('description_suggestions')
      .insert({
        user_id: userId,
        text
      });

    if (error) {
      console.error('Error adding description suggestion:', error.message);
    }
  },

  deleteDescriptionSuggestion: async (userId: string, id: string): Promise<void> => {
    checkReadOnly();
    const { error } = await supabase
      .from('description_suggestions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) console.error('Error deleting description suggestion:', error.message);
  },

  // --- LOANS (EMPRÉSTIMOS) ---
  getLoans: async (userId: string): Promise<Loan[]> => {
    const [loansRes, paymentsRes] = await Promise.all([
      supabase
        .from('loans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('loan_payments')
        .select('*')
        .eq('user_id', userId)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);

    if (loansRes.error) {
      console.error('Error fetching loans:', loansRes.error.message);
      return [];
    }

    const paymentsByLoan = new Map<string, LoanPayment[]>();
    if (!paymentsRes.error && paymentsRes.data) {
      for (const p of paymentsRes.data as any[]) {
        const mapped: LoanPayment = {
          id: p.id,
          loanId: p.loan_id,
          userId: p.user_id,
          paymentType: p.payment_type,
          paymentDate: p.payment_date,
          totalPaid: Number(p.total_paid),
          lateFeePaid: Number(p.late_fee_paid),
          interestPaid: Number(p.interest_paid),
          principalAmortized: Number(p.principal_amortized),
          daysOverdue: Number(p.days_overdue),
          principalBefore: Number(p.principal_before),
          principalAfter: Number(p.principal_after),
          previousDueDate: p.previous_due_date,
          newDueDate: p.new_due_date,
          accountId: p.account_id ?? undefined,
          transactionId: p.transaction_id ?? undefined,
          notes: p.notes ?? undefined,
          createdAt: p.created_at,
        };
        const list = paymentsByLoan.get(mapped.loanId) || [];
        list.push(mapped);
        paymentsByLoan.set(mapped.loanId, list);
      }
    }

    return (loansRes.data || []).map((l: any): Loan => ({
      id: l.id,
      userId: l.user_id,
      contactId: l.contact_id ?? undefined,
      accountId: l.account_id ?? undefined,
      borrowerName: l.borrower_name,
      originalPrincipal: Number(l.original_principal),
      currentPrincipal: Number(l.current_principal),
      cyclePrincipal: Number(l.cycle_principal),
      interestRate: Number(l.interest_rate),
      lateFeeType: l.late_fee_type as LoanLateFeeType,
      lateFeeValue: Number(l.late_fee_value),
      startDate: l.start_date,
      dueDate: l.due_date,
      renewalsCount: Number(l.renewals_count),
      status: l.status,
      paidOffAt: l.paid_off_at ?? undefined,
      notes: l.notes ?? undefined,
      createdTransactionId: l.created_transaction_id ?? undefined,
      createdAt: l.created_at,
      updatedAt: l.updated_at ?? undefined,
      payments: paymentsByLoan.get(l.id) || [],
    }));
  },

  createLoan: async (
    userId: string,
    payload: {
      contactId?: string;
      borrowerName: string;
      originalPrincipal: number;
      interestRate: number;
      lateFeeType: LoanLateFeeType;
      lateFeeValue: number;
      startDate: string;
      notes?: string;
      postToCashFlow: boolean;
      accountId?: string;
      categoryId?: string;
      paymentMethodId?: string;
    },
  ): Promise<{ ok: boolean; error?: string }> => {
    checkReadOnly();

    const principal = roundMoney(payload.originalPrincipal);
    const dueDate = addDaysISO(payload.startDate, 30);
    let createdTransactionId: string | null = null;

    if (payload.postToCashFlow && payload.accountId) {
      const tx = await dataService.createTransaction(userId, {
        description: `Empréstimo concedido - ${payload.borrowerName}`,
        amount: principal,
        date: payload.startDate,
        paymentDate: payload.startDate,
        type: 'EXPENSE',
        status: 'PAID',
        accountId: payload.accountId,
        categoryId: payload.categoryId || null,
        paymentMethodId: payload.paymentMethodId || null,
        contactId: payload.contactId || null,
        isRecurring: false,
        observation: `Capital emprestado: ${formatCurrencyBRL(principal)} | Juros: ${payload.interestRate}% / 30 dias | 1º vencimento: ${dueDate}${payload.notes ? ` | ${payload.notes}` : ''}`,
      });
      if (tx?.id) {
        createdTransactionId = tx.id;
      }
    }

    const { error } = await supabase.from('loans').insert([
      {
        user_id: userId,
        contact_id: payload.contactId || null,
        account_id: payload.accountId || null,
        borrower_name: payload.borrowerName.trim(),
        original_principal: principal,
        current_principal: principal,
        cycle_principal: principal,
        interest_rate: payload.interestRate,
        late_fee_type: payload.lateFeeType,
        late_fee_value: payload.lateFeeValue,
        start_date: payload.startDate,
        due_date: dueDate,
        renewals_count: 0,
        status: 'ACTIVE',
        notes: payload.notes?.trim() || null,
        created_transaction_id: createdTransactionId,
      },
    ]);

    if (error) {
      console.error('Error creating loan:', error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  },

  registerLoanPayment: async (
    userId: string,
    loan: Loan,
    payload: {
      paymentType: LoanPaymentType;
      paymentDate: string;
      amount: number;
      notes?: string;
      postToCashFlow: boolean;
      accountId?: string;
      categoryId?: string;
      paymentMethodId?: string;
    },
  ): Promise<{ ok: boolean; error?: string }> => {
    checkReadOnly();

    const sim = simulateLoanPayment(
      loan,
      payload.paymentType,
      payload.paymentDate,
      payload.amount,
    );

    if (!sim.valid) {
      return { ok: false, error: sim.error || 'Simulação de pagamento inválida.' };
    }

    let transactionId: string | null = null;
    if (payload.postToCashFlow && payload.accountId) {
      const breakdownParts: string[] = [];
      if (sim.lateFeePaid > 0) {
        breakdownParts.push(`Encargos: ${formatCurrencyBRL(sim.lateFeePaid)}`);
      }
      if (sim.interestPaid > 0) {
        breakdownParts.push(`Juros: ${formatCurrencyBRL(sim.interestPaid)}`);
      }
      if (sim.principalAmortized > 0) {
        breakdownParts.push(`Amortização: ${formatCurrencyBRL(sim.principalAmortized)}`);
      }

      const tx = await dataService.createTransaction(userId, {
        description: `${LOAN_PAYMENT_TYPE_LABELS[sim.paymentType]} - ${loan.borrowerName}`,
        amount: sim.totalPaid,
        date: sim.paymentDate,
        paymentDate: sim.paymentDate,
        type: 'INCOME',
        status: 'PAID',
        accountId: payload.accountId,
        categoryId: payload.categoryId || null,
        paymentMethodId: payload.paymentMethodId || null,
        contactId: loan.contactId || null,
        isRecurring: false,
        observation: `${breakdownParts.join(' | ')} | Saldo após: ${formatCurrencyBRL(sim.principalAfter)}${payload.notes ? ` | ${payload.notes}` : ''}`,
      });
      if (tx?.id) {
        transactionId = tx.id;
      }
    }

    const { error: paymentError } = await supabase.from('loan_payments').insert([
      {
        loan_id: loan.id,
        user_id: userId,
        payment_type: sim.paymentType,
        payment_date: sim.paymentDate,
        total_paid: sim.totalPaid,
        late_fee_paid: sim.lateFeePaid,
        interest_paid: sim.interestPaid,
        principal_amortized: sim.principalAmortized,
        days_overdue: sim.daysOverdue,
        principal_before: sim.principalBefore,
        principal_after: sim.principalAfter,
        previous_due_date: sim.previousDueDate,
        new_due_date: sim.newDueDate,
        account_id: payload.accountId || null,
        transaction_id: transactionId,
        notes: payload.notes?.trim() || null,
      },
    ]);

    if (paymentError) {
      console.error('Error registering loan payment:', paymentError.message);
      return { ok: false, error: paymentError.message };
    }

    const { error: loanUpdateError } = await supabase
      .from('loans')
      .update({
        current_principal: sim.principalAfter,
        cycle_principal: sim.nextCyclePrincipal,
        due_date: sim.newDueDate,
        renewals_count: sim.newRenewalsCount,
        status: sim.newStatus,
        paid_off_at: sim.newStatus === 'PAID_OFF' ? sim.paymentDate : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loan.id)
      .eq('user_id', userId);

    if (loanUpdateError) {
      console.error('Error updating loan after payment:', loanUpdateError.message);
      return { ok: false, error: loanUpdateError.message };
    }

    return { ok: true };
  },

  deleteLoan: async (userId: string, loanId: string): Promise<void> => {
    checkReadOnly();
    const { error } = await supabase
      .from('loans')
      .delete()
      .eq('id', loanId)
      .eq('user_id', userId);

    if (error) console.error('Error deleting loan:', error.message);
  },
};

