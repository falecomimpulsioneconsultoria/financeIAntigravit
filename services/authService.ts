
import { User, UserPermissions, AccountType } from '../types';
import { supabase } from '../lib/supabaseClient';

const CURRENT_USER_KEY = 'finances_current_user_cache';

// Default permissions for Main User (Everything allowed)
const FULL_ACCESS: UserPermissions = {
  viewDashboard: true,
  manageTransactions: true,
  manageAccounts: true,
  manageCategories: true,
  viewReports: true,
  viewSettings: true
};

export const authService = {
  // Check Supabase session
  getSessionUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return null;

    // Fetch Profile Data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile) return null;

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role || 'USER',
      isActive: profile.is_active,
      createdAt: profile.created_at,
      expirationDate: profile.expiration_date,
      subscriptionPrice: profile.subscription_price,
      accountType: profile.account_type,
      document: profile.document,
      subUsers: profile.sub_users || [],
      activePermissions: FULL_ACCESS // Main user always has full access
    };
  },

  // Update user data (Profile)
  updateUser: async (userId: string, updates: Partial<User>): Promise<void> => {
    // Map Frontend types to DB columns if necessary
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.expirationDate) dbUpdates.expiration_date = updates.expirationDate;
    if (updates.subUsers) dbUpdates.sub_users = updates.subUsers;
    // ... map other fields

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId);

    if (error) throw new Error(error.message);
  },

  changePassword: async (userId: string, currentPass: string, newPass: string): Promise<void> => {
    // Supabase handles password updates directly without needing old password if logged in
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw new Error(error.message);
  },

  // Admin: Renew Subscription
  renewSubscription: async (userId: string, amount: number): Promise<User> => {
    // Fetch current profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profile) throw new Error("Profile not found");

    const now = new Date();
    const currentExp = new Date(profile.expiration_date);
    let newExpDate = new Date();
    if (currentExp > now) {
      newExpDate = new Date(currentExp);
    }
    newExpDate.setDate(newExpDate.getDate() + 30);

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({
        expiration_date: newExpDate.toISOString(),
        is_active: true,
        // We'd ideally store payments in a separate table, but for now just update profile
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Return mapped user
    return {
      ...updatedProfile,
      expirationDate: updatedProfile.expiration_date,
      isActive: updatedProfile.is_active,
      // Mapping back
      id: updatedProfile.id,
      name: updatedProfile.name,
      email: updatedProfile.email,
      role: updatedProfile.role,
      createdAt: updatedProfile.created_at,
      subscriptionPrice: updatedProfile.subscription_price,
      accountType: updatedProfile.account_type,
      document: updatedProfile.document,
      subUsers: updatedProfile.sub_users,
      activePermissions: FULL_ACCESS
    };
  },

  register: async (name: string, email: string, password: string, accountType: AccountType, document: string): Promise<User> => {
    // 1. SignUp with metadata that the trigger will use
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          account_type: accountType,
          document: document
        }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error("Erro ao criar usuário.");

    // The trigger public.handle_new_user handles profile creation.

    // Create default payment methods
    const defaultMethods = ['Dinheiro', 'Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto'];
    const paymentMethodsPayload = defaultMethods.map(name => ({
      user_id: data.user!.id,
      name
    }));

    await supabase.from('payment_methods').insert(paymentMethodsPayload);

    // We can return the user object directly.
    const userObj = {
      id: data.user.id,
      name,
      email,
      role: 'USER' as const,
      isActive: true,
      createdAt: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      accountType,
      document,
      subUsers: [],
      activePermissions: FULL_ACCESS
    };

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userObj));
    return userObj;
  },

  login: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    if (!data.user) throw new Error("Usuário não encontrado.");

    // Fetch Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) throw new Error("Perfil não encontrado.");

    // Persist Cache for fast load on App.tsx before async check
    const userObj = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      isActive: profile.is_active,
      createdAt: profile.created_at,
      expirationDate: profile.expiration_date,
      subscriptionPrice: profile.subscription_price,
      accountType: profile.account_type,
      document: profile.document,
      subUsers: profile.sub_users || [],
      activePermissions: FULL_ACCESS
    };

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userObj));
    return userObj;
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  verifyPassword: async (userId: string, password: string): Promise<boolean> => {
    // 1. Get current user details to find email
    const { data: { user } } = await supabase.auth.getUser();

    // Ensure we are verifying the currently logged-in user
    if (!user || user.id !== userId || !user.email) return false;

    // 2. Attempt to sign in (re-authenticate) to verify password
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password
    });

    return !error;
  },

  getCurrentUser: (): User | null => {
    // Returns cached user for immediate UI rendering, then App.tsx should validate session
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  getUsers: async (): Promise<User[]> => {
    // Admin function
    const { data } = await supabase.from('profiles').select('*');
    if (!data) return [];
    return data.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role,
      isActive: p.is_active,
      createdAt: p.created_at,
      expirationDate: p.expiration_date,
      subscriptionPrice: p.subscription_price,
      accountType: p.account_type,
      document: p.document,
      subUsers: p.sub_users,
    }));
  }
};
