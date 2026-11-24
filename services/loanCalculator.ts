import { Loan, LoanPayment, LoanPaymentType, LoanStatus } from '../types';

export const roundMoney = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

export const getTodayISO = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseISODateUTC = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
};

export const addDaysISO = (dateStr: string, days: number): string => {
  const dt = parseISODateUTC(dateStr);
  dt.setUTCDate(dt.getUTCDate() + days);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const diffDaysISO = (fromDateStr: string, toDateStr: string): number => {
  const from = parseISODateUTC(fromDateStr).getTime();
  const to = parseISODateUTC(toDateStr).getTime();
  return Math.floor((to - from) / 86400000);
};

export const formatDateBR = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export const formatCurrencyBRL = (value: number, currency = 'BRL'): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value || 0);
};

export interface LoanCalculatedSummary {
  daysOverdue: number;
  daysUntilDue: number;
  isOverdue: boolean;
  isDueToday: boolean;
  dailyLateFee: number;
  accumulatedLateFee: number;
  currentCycleInterest: number;
  nextCycleInterest: number;
  renewalAmount: number; // Juros do ciclo atual + encargos de atraso
  totalPayoffAmount: number; // Saldo devedor + juros do ciclo atual + encargos de atraso
  nextDueDateIfRenewed: string; // Data original do vencimento + 30 dias
  totalInterestPaid: number;
  totalLateFeesPaid: number;
  totalPrincipalAmortized: number;
  totalPaidOverall: number;
}

export const calculateLoanSummary = (
  loan: Loan,
  referenceDate: string = getTodayISO(),
): LoanCalculatedSummary => {
  const payments: LoanPayment[] = loan.payments || [];

  const totalInterestPaid = roundMoney(
    payments.reduce((acc, p) => acc + Number(p.interestPaid || 0), 0),
  );
  const totalLateFeesPaid = roundMoney(
    payments.reduce((acc, p) => acc + Number(p.lateFeePaid || 0), 0),
  );
  const totalPrincipalAmortized = roundMoney(
    payments.reduce((acc, p) => acc + Number(p.principalAmortized || 0), 0),
  );
  const totalPaidOverall = roundMoney(
    payments.reduce((acc, p) => acc + Number(p.totalPaid || 0), 0),
  );

  if (loan.status === 'PAID_OFF' || loan.currentPrincipal <= 0) {
    return {
      daysOverdue: 0,
      daysUntilDue: 0,
      isOverdue: false,
      isDueToday: false,
      dailyLateFee: 0,
      accumulatedLateFee: 0,
      currentCycleInterest: 0,
      nextCycleInterest: 0,
      renewalAmount: 0,
      totalPayoffAmount: 0,
      nextDueDateIfRenewed: loan.dueDate,
      totalInterestPaid,
      totalLateFeesPaid,
      totalPrincipalAmortized,
      totalPaidOverall,
    };
  }

  const diff = diffDaysISO(loan.dueDate, referenceDate);
  const daysOverdue = Math.max(0, diff);
  const daysUntilDue = diff < 0 ? Math.abs(diff) : 0;
  const isOverdue = daysOverdue > 0;
  const isDueToday = diff === 0;

  const dailyLateFee =
    loan.lateFeeType === 'FIXED'
      ? roundMoney(loan.lateFeeValue)
      : roundMoney(loan.currentPrincipal * (loan.lateFeeValue / 100));

  const accumulatedLateFee = roundMoney(dailyLateFee * daysOverdue);

  // Juros do ciclo atual (usa cyclePrincipal para respeitar regra de amortização antecipada)
  const currentCycleInterest = roundMoney(
    loan.cyclePrincipal * (loan.interestRate / 100),
  );

  // Próximos juros de 30 dias (sempre sobre o currentPrincipal atualizado)
  const nextCycleInterest = roundMoney(
    loan.currentPrincipal * (loan.interestRate / 100),
  );

  const renewalAmount = roundMoney(currentCycleInterest + accumulatedLateFee);
  const totalPayoffAmount = roundMoney(
    loan.currentPrincipal + currentCycleInterest + accumulatedLateFee,
  );

  // Regra confirmada: renovação sempre conta +30 dias a partir da data original do vencimento
  const nextDueDateIfRenewed = addDaysISO(loan.dueDate, 30);

  return {
    daysOverdue,
    daysUntilDue,
    isOverdue,
    isDueToday,
    dailyLateFee,
    accumulatedLateFee,
    currentCycleInterest,
    nextCycleInterest,
    renewalAmount,
    totalPayoffAmount,
    nextDueDateIfRenewed,
    totalInterestPaid,
    totalLateFeesPaid,
    totalPrincipalAmortized,
    totalPaidOverall,
  };
};

export interface PaymentSimulationResult {
  valid: boolean;
  error?: string;
  paymentType: LoanPaymentType;
  paymentDate: string;
  daysOverdue: number;
  totalPaid: number;
  lateFeePaid: number;
  interestPaid: number;
  principalAmortized: number;
  principalBefore: number;
  principalAfter: number;
  nextCyclePrincipal: number;
  nextCycleInterest: number;
  nextPayoffEstimate: number;
  previousDueDate: string;
  newDueDate: string;
  newRenewalsCount: number;
  newStatus: LoanStatus;
}

export const simulateLoanPayment = (
  loan: Loan,
  paymentType: LoanPaymentType,
  paymentDate: string,
  inputAmount: number,
): PaymentSimulationResult => {
  const summary = calculateLoanSummary(loan, paymentDate);
  const principalBefore = roundMoney(loan.currentPrincipal);
  const previousDueDate = loan.dueDate;

  const baseInvalid = (error: string): PaymentSimulationResult => ({
    valid: false,
    error,
    paymentType,
    paymentDate,
    daysOverdue: summary.daysOverdue,
    totalPaid: roundMoney(inputAmount),
    lateFeePaid: 0,
    interestPaid: 0,
    principalAmortized: 0,
    principalBefore,
    principalAfter: principalBefore,
    nextCyclePrincipal: loan.cyclePrincipal,
    nextCycleInterest: summary.nextCycleInterest,
    nextPayoffEstimate: summary.totalPayoffAmount,
    previousDueDate,
    newDueDate: previousDueDate,
    newRenewalsCount: loan.renewalsCount,
    newStatus: loan.status,
  });

  if (loan.status === 'PAID_OFF' || principalBefore <= 0) {
    return baseInvalid('Este empréstimo já está quitado.');
  }

  if (paymentType === 'INTEREST_ONLY') {
    const required = summary.renewalAmount;
    const totalPaid = required;
    const newDueDate = addDaysISO(previousDueDate, 30);
    const nextCyclePrincipal = principalBefore;
    const nextCycleInterest = roundMoney(
      nextCyclePrincipal * (loan.interestRate / 100),
    );

    return {
      valid: true,
      paymentType,
      paymentDate,
      daysOverdue: summary.daysOverdue,
      totalPaid,
      lateFeePaid: summary.accumulatedLateFee,
      interestPaid: summary.currentCycleInterest,
      principalAmortized: 0,
      principalBefore,
      principalAfter: principalBefore,
      nextCyclePrincipal,
      nextCycleInterest,
      nextPayoffEstimate: roundMoney(principalBefore + nextCycleInterest),
      previousDueDate,
      newDueDate,
      newRenewalsCount: loan.renewalsCount + 1,
      newStatus: 'ACTIVE',
    };
  }

  if (paymentType === 'INTEREST_AND_AMORTIZATION') {
    const totalPaid = roundMoney(inputAmount);
    const minRequired = summary.renewalAmount;
    const maxAllowed = summary.totalPayoffAmount;

    if (totalPaid <= minRequired) {
      return baseInvalid(
        `O valor deve ser maior que ${formatCurrencyBRL(minRequired)} (encargos + juros) para incluir amortização.`,
      );
    }
    if (totalPaid > maxAllowed + 0.009) {
      return baseInvalid(
        `O valor não pode exceder a quitação total de ${formatCurrencyBRL(maxAllowed)}.`,
      );
    }

    const lateFeePaid = summary.accumulatedLateFee;
    const interestPaid = summary.currentCycleInterest;
    const rawAmortization = roundMoney(totalPaid - lateFeePaid - interestPaid);
    const principalAmortized = roundMoney(
      Math.min(principalBefore, rawAmortization),
    );
    const principalAfter = roundMoney(
      Math.max(0, principalBefore - principalAmortized),
    );
    const isPaidOff = principalAfter <= 0;
    const newDueDate = isPaidOff
      ? previousDueDate
      : addDaysISO(previousDueDate, 30);
    const nextCyclePrincipal = principalAfter;
    const nextCycleInterest = isPaidOff
      ? 0
      : roundMoney(nextCyclePrincipal * (loan.interestRate / 100));

    return {
      valid: true,
      paymentType,
      paymentDate,
      daysOverdue: summary.daysOverdue,
      totalPaid,
      lateFeePaid,
      interestPaid,
      principalAmortized,
      principalBefore,
      principalAfter,
      nextCyclePrincipal,
      nextCycleInterest,
      nextPayoffEstimate: roundMoney(principalAfter + nextCycleInterest),
      previousDueDate,
      newDueDate,
      newRenewalsCount: isPaidOff ? loan.renewalsCount : loan.renewalsCount + 1,
      newStatus: isPaidOff ? 'PAID_OFF' : 'ACTIVE',
    };
  }

  if (paymentType === 'EARLY_AMORTIZATION') {
    const totalPaid = roundMoney(inputAmount);

    if (totalPaid <= 0) {
      return baseInvalid('Informe um valor de amortização maior que zero.');
    }
    if (totalPaid >= principalBefore) {
      return baseInvalid(
        `Para quitar todo o saldo devedor (${formatCurrencyBRL(principalBefore)}), utilize a opção "Quitação Total".`,
      );
    }

    const principalAmortized = totalPaid;
    const principalAfter = roundMoney(principalBefore - principalAmortized);
    // Regra confirmada: amortização antecipada mantém cyclePrincipal para o ciclo atual
    // e reduz os juros a partir do próximo ciclo de 30 dias
    const nextCycleInterest = roundMoney(
      principalAfter * (loan.interestRate / 100),
    );

    return {
      valid: true,
      paymentType,
      paymentDate,
      daysOverdue: summary.daysOverdue,
      totalPaid,
      lateFeePaid: 0,
      interestPaid: 0,
      principalAmortized,
      principalBefore,
      principalAfter,
      nextCyclePrincipal: loan.cyclePrincipal,
      nextCycleInterest,
      nextPayoffEstimate: roundMoney(
        principalAfter + summary.currentCycleInterest + summary.accumulatedLateFee,
      ),
      previousDueDate,
      newDueDate: previousDueDate,
      newRenewalsCount: loan.renewalsCount,
      newStatus: 'ACTIVE',
    };
  }

  // FULL_SETTLEMENT
  const totalPaid = summary.totalPayoffAmount;
  return {
    valid: true,
    paymentType: 'FULL_SETTLEMENT',
    paymentDate,
    daysOverdue: summary.daysOverdue,
    totalPaid,
    lateFeePaid: summary.accumulatedLateFee,
    interestPaid: summary.currentCycleInterest,
    principalAmortized: principalBefore,
    principalBefore,
    principalAfter: 0,
    nextCyclePrincipal: 0,
    nextCycleInterest: 0,
    nextPayoffEstimate: 0,
    previousDueDate,
    newDueDate: previousDueDate,
    newRenewalsCount: loan.renewalsCount,
    newStatus: 'PAID_OFF',
  };
};

export const LOAN_PAYMENT_TYPE_LABELS: Record<LoanPaymentType, string> = {
  INTEREST_ONLY: 'Pagamento de Juros (Renovação)',
  INTEREST_AND_AMORTIZATION: 'Juros + Amortização',
  EARLY_AMORTIZATION: 'Amortização Antecipada',
  FULL_SETTLEMENT: 'Quitação Total',
};
