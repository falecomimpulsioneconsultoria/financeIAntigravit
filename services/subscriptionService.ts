import { PlanInterval, User, PaymentStatus, Invoice, WebhookPayload } from "../types";

export const subscriptionService = {
  // 1. Validação de Documentos (Simulada)
  validateDocument: (document: string, type: 'PERSONAL' | 'BUSINESS'): boolean => {
    const cleanDoc = document.replace(/\D/g, '');
    if (type === 'PERSONAL') return cleanDoc.length === 11; // CPF
    if (type === 'BUSINESS') return cleanDoc.length === 14; // CNPJ
    return false;
  },

  // 2. Cálculo de Vencimento
  calculateNextDue: (currentExpiration: string, interval: PlanInterval): string => {
    const date = new Date(currentExpiration);
    switch (interval) {
      case 'MONTHLY': date.setMonth(date.getMonth() + 1); break;
      case 'QUARTERLY': date.setMonth(date.getMonth() + 3); break;
      case 'SEMESTER': date.setMonth(date.getMonth() + 6); break;
      case 'ANNUAL': date.setFullYear(date.getFullYear() + 1); break;
    }
    return date.toISOString();
  },

  // 3. Checagem de Status (Regras de Ouro)
  checkUserStatus: (user: User): { status: PaymentStatus, daysOverdue: number } => {
    const now = new Date();
    const expiration = new Date(user.expirationDate);
    const diffTime = now.getTime() - expiration.getTime();
    const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) return { status: 'PAID', daysOverdue: 0 };
    if (daysOverdue > 3) return { status: 'SUSPENDED', daysOverdue };
    return { status: 'OVERDUE', daysOverdue };
  },

  // 4. Processamento de Webhook (Simulado)
  processPaymentWebhook: (payload: WebhookPayload, currentUser: User): User => {
    if (payload.event === 'PAYMENT_FAILED') {
      return { ...currentUser, billingAttempts: (currentUser.billingAttempts || 0) + 1 };
    }

    // Sucesso
    // Buscar intervalo do plano (mockado, na real buscaria do banco)
    const mockPlanInterval: PlanInterval = 'MONTHLY'; 
    const nextExpiration = subscriptionService.calculateNextDue(currentUser.expirationDate, mockPlanInterval);

    return {
      ...currentUser,
      paymentStatus: 'PAID',
      expirationDate: nextExpiration,
      billingAttempts: 0,
      lastInvoiceId: payload.transactionId
    };
  },

  // 5. Gerar Fatura (Simulado)
  generateInvoice: (user: User): Invoice => {
    return {
      id: crypto.randomUUID(),
      userId: user.id,
      amount: user.subscriptionPrice || 0,
      status: 'PENDING',
      dueDate: user.expirationDate,
      referenceMonth: new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
      pdfUrl: '#'
    };
  },

  // Mock de histórico de faturas
  getInvoices: (userId: string): Invoice[] => {
    // Retorna dados mockados para exemplo
    return [
      { id: 'inv_001', userId, amount: 49.90, status: 'PAID', dueDate: '2024-01-15', paidAt: '2024-01-14', referenceMonth: '01/2024' },
      { id: 'inv_002', userId, amount: 49.90, status: 'PAID', dueDate: '2024-02-15', paidAt: '2024-02-15', referenceMonth: '02/2024' },
      { id: 'inv_003', userId, amount: 49.90, status: 'PENDING', dueDate: '2024-03-15', referenceMonth: '03/2024' },
    ];
  }
};
