
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type PersonType = 'FISICA' | 'JURIDICA';

export type ContactLabel =
  | 'Cliente'
  | 'Banqueiro'
  | 'Transportadora'
  | 'Tecnico'
  | 'Fornecedor'
  | 'Colaborador'
  | 'Representada'
  | 'Vendedor'
  | 'Credenciadora'
  | 'Fabricante';

export interface Contact {
  id: string;
  userId: string;
  fantasyName: string;
  legalName?: string;
  personType: PersonType;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  mobile?: string;
  labels: ContactLabel[];
  bankerId?: string;
  isActive: boolean;
  createdAt: string;
}

export type TransactionStatus = 'PAID' | 'PENDING';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type RecurrenceType = 'FIXED' | 'INSTALLMENT';
export type AccountType = 'PERSONAL' | 'BUSINESS'; // Perfil do Usuário
export type BankAccountType = 'CHECKING' | 'INVESTMENT' | 'CASH'; // Tipo da Conta Bancária
export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'SUSPENDED'; // Pago, Pendente, Atrasado, Suspenso
export type PlanInterval = 'MONTHLY' | 'QUARTERLY' | 'SEMESTER' | 'ANNUAL';

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

export interface Invoice {
    id: string;
    userId: string;
    amount: number;
    status: PaymentStatus;
    dueDate: string;
    paidAt?: string;
    referenceMonth: string; // MM/YYYY
    pdfUrl?: string; // Link para boleto/nf
}

export interface WebhookPayload {
    event: 'PAYMENT_RECEIVED' | 'PAYMENT_FAILED';
    userId: string;
    amount: number;
    transactionId: string;
    gateway: 'STRIPE' | 'MERCADOPAGO' | 'ASAAS';
}

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

export interface Plan {
  id: string;
  name: string;
  interval: PlanInterval;
  price: number;
  description?: string;
}

export interface User {
  id: string;
  name: string; // Nome Completo ou Razão Social
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string; // ISO Date
  expirationDate: string; // ISO Date (data_vencimento)
  subscriptionStartDate?: string; // ISO Date (data_inicio_assinatura)
  paymentStatus: PaymentStatus; // Pago, Pendente, Atrasado, Suspenso
  subscriptionPrice?: number; // Valor padrão a ser cobrado (valor_recorrente)
  planId?: string; // ID do plano selecionado
  billingAttempts?: number; // Contador de tentativas de cobrança
  lastInvoiceId?: string; // Link para última fatura


  // New Profile Fields
  accountType: AccountType;
  document?: string; // CPF ou CNPJ
  photoUrl?: string; // Base64 or URL
  subUsers?: SubUser[];
  ownerId?: string; // ID do dono da conta (se for membro de equipe)

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
  contactId?: string; // Pessoa / Fornecedor — opcional para retrocompatibilidade
}

export interface DescriptionSuggestion {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
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

// =====================================================
// MÓDULO DE CONTROLE DE EMPRÉSTIMOS
// =====================================================
export type LoanLateFeeType = 'FIXED' | 'PERCENTAGE';
export type LoanStatus = 'ACTIVE' | 'PAID_OFF';
export type LoanPaymentType =
  | 'INTEREST_ONLY'
  | 'INTEREST_AND_AMORTIZATION'
  | 'EARLY_AMORTIZATION'
  | 'FULL_SETTLEMENT';

export interface LoanPayment {
  id: string;
  loanId: string;
  userId: string;
  paymentType: LoanPaymentType;
  paymentDate: string; // YYYY-MM-DD
  totalPaid: number;
  lateFeePaid: number;
  interestPaid: number;
  principalAmortized: number;
  daysOverdue: number;
  principalBefore: number;
  principalAfter: number;
  previousDueDate: string; // YYYY-MM-DD
  newDueDate: string; // YYYY-MM-DD
  accountId?: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
}

export interface Loan {
  id: string;
  userId: string;
  contactId?: string;
  bankerId?: string;
  bankerName?: string;
  accountId?: string;
  borrowerName: string;
  originalPrincipal: number;
  currentPrincipal: number;
  cyclePrincipal: number; // Base de cálculo dos juros do ciclo atual (preservada em amortização antecipada)
  interestRate: number; // % a cada 30 dias
  lateFeeType: LoanLateFeeType; // 'FIXED' (R$/dia) ou 'PERCENTAGE' (%/dia)
  lateFeeValue: number;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  renewalsCount: number;
  status: LoanStatus;
  paidOffAt?: string;
  notes?: string;
  createdTransactionId?: string;
  createdAt: string;
  updatedAt?: string;
  payments?: LoanPayment[];
}


