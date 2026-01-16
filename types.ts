
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type TransactionStatus = 'PAID' | 'PENDING';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type RecurrenceType = 'FIXED' | 'INSTALLMENT';
export type AccountType = 'PERSONAL' | 'BUSINESS'; // Perfil do Usuário
export type BankAccountType = 'CHECKING' | 'INVESTMENT' | 'CASH'; // Tipo da Conta Bancária

// Mapeamento para o DRE de Representação Comercial
export type DreCategory =
  | 'DRE_GROSS_REVENUE'        // (+) Receita Bruta
  | 'DRE_TAXES'                // (-) Impostos sobre Vendas
  | 'DRE_COSTS'                // (-) Custos do Serviço (Comissões repassadas)
  | 'DRE_EXPENSE_PERSONNEL'    // (-) Despesas com Pessoal (Pró-labore)
  | 'DRE_EXPENSE_COMMERCIAL'   // (-) Despesas Comerciais (Viagem, Carro)
  | 'DRE_EXPENSE_ADMIN'        // (-) Despesas Administrativas (Contador, Aluguel)
  | 'DRE_FINANCIAL_INCOME'     // (+) Receita Financeira
  | 'DRE_FINANCIAL_EXPENSE';   // (-) Despesa Financeira

export interface UserPermissions {
  viewDashboard: boolean;
  manageTransactions: boolean; // Criar, Editar, Excluir, Baixar
  manageAccounts: boolean;     // Criar, Editar, Excluir Contas
  manageCategories: boolean;   // Criar, Editar, Excluir Categorias
  viewReports: boolean;        // Acessar Relatórios
  viewSettings: boolean;       // Acessar Configurações
}

export interface SubUser {
  id: string;
  name: string;
  email?: string;
  password?: string;
  role: 'VIEWER' | 'EDITOR'; // Mantido para retrocompatibilidade, mas permissions terá prioridade
  permissions: UserPermissions;
}

export interface User {
  id: string;
  name: string; // Nome Completo ou Razão Social
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string; // ISO Date
  expirationDate: string; // ISO Date
  lastPaymentDate?: string; // ISO Date
  lastPaymentAmount?: number;
  subscriptionPrice?: number; // Valor padrão a ser cobrado

  // New Profile Fields
  accountType: AccountType;
  document?: string; // CPF ou CNPJ
  photoUrl?: string; // Base64 or URL
  subUsers?: SubUser[];

  // Active Session Permissions (Injected during login)
  activePermissions?: UserPermissions;
}

export interface Account {
  id: string;
  name: string;
  balance: number; // Current balance
  color: string;
  type: BankAccountType; // Novo campo
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  parentId?: string; // ID da categoria pai, se for uma subcategoria
  dreCategory?: DreCategory; // Campo novo para mapeamento do DRE
  budgetLimit?: number; // Meta ou Limite Mensal

  // Optional for AI Generation Structure (Frontend only)
  subcategories?: Omit<Category, 'id'>[];
}

export interface PaymentMethod {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  paymentDate?: string;
  type: TransactionType;
  categoryId?: string;
  accountId: string;
  toAccountId?: string;
  paymentMethodId?: string;
  status: 'PAID' | 'PENDING';
  observation?: string;
  tags?: string[];
  receiptUrl?: string;
  groupId?: string;
  isRecurring: boolean;
  recurringType?: RecurrenceType;
  installmentCurrent?: number;
  installmentTotal?: number;
  parentId?: string;
}

export interface FinancialSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  pendingIncome: number;
  pendingExpense: number;
}

export interface DashboardConfig {
  showBalanceCard: boolean;
  showIncomeCard: boolean;
  showExpenseCard: boolean;
  showPendingCard: boolean;
  showAIAnalysis: boolean;
  showCharts: boolean;
  currency: string;
}

// Interface Estruturada para o Retorno da IA
export interface AIAnalysisResult {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  summary: string; // Resumo curto (1 frase)
  insights: string[]; // Pontos chave (Bullet points)
  recommendation: string; // Ação imediata
  detailedReasoning: string; // Texto longo para "expandir"
}

// INVESTMENTS
export type InvestmentType = 'STOCK' | 'REIT' | 'FIXED_INCOME' | 'CRYPTO' | 'OTHER';
export type InvestmentTransactionType = 'BUY' | 'SELL' | 'DIVIDEND' | 'JCP';

export interface InvestmentAsset {
  id: string;
  userId: string;
  ticker?: string;
  name: string;
  type: InvestmentType;
  currentPrice: number;
  quantity: number;
  averagePrice: number;
  createdAt?: string;
}

export interface InvestmentTransaction {
  id: string;
  assetId: string;
  userId: string;
  type: InvestmentTransactionType;
  quantity: number;
  price: number;
  totalAmount: number;
  date: string;
  fees: number;
}
