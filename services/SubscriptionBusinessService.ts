import { PlanInterval, User, PaymentStatus, WebhookPayload } from "../types";
import { SubscriptionRepository } from "../repositories/SubscriptionRepository";

export const SubscriptionBusinessService = {
  // 1. Validação de Documentos
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
  determineUserStatus: (user: User): { status: PaymentStatus, daysOverdue: number } => {
    const now = new Date();
    const expiration = new Date(user.expirationDate);
    const diffTime = now.getTime() - expiration.getTime();
    const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) return { status: 'PAID', daysOverdue: 0 };
    if (daysOverdue > 3) return { status: 'SUSPENDED', daysOverdue };
    return { status: 'OVERDUE', daysOverdue };
  },

  // 4. Processamento de Webhook
  processPaymentWebhook: async (payload: WebhookPayload, currentUser: User): Promise<User> => {
    if (payload.event === 'PAYMENT_FAILED') {
        const attempts = (currentUser.billingAttempts || 0) + 1;
        return SubscriptionRepository.updateUserSubscriptionData(currentUser, { billingAttempts: attempts });
    }

    // Sucesso
    const mockPlanInterval: PlanInterval = 'MONTHLY'; // Should come from plan details
    const nextExpiration = SubscriptionBusinessService.calculateNextDue(currentUser.expirationDate, mockPlanInterval);

    const updatedUser = await SubscriptionRepository.updateUserSubscriptionData(currentUser, {
      paymentStatus: 'PAID',
      expirationDate: nextExpiration,
      billingAttempts: 0,
      lastInvoiceId: payload.transactionId
    });

    // Generate and save invoice
    const newInvoice = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        amount: currentUser.subscriptionPrice || 0,
        status: 'PAID' as const,
        dueDate: currentUser.expirationDate,
        paidAt: new Date().toISOString(),
        referenceMonth: new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
        pdfUrl: '#'
    };
    await SubscriptionRepository.saveInvoice(newInvoice);

    return updatedUser;
  }
};
