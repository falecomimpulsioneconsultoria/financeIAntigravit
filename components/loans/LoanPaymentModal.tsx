import React, { useState, useMemo, useEffect } from 'react';
import { Account, Category, Loan, LoanPaymentType, PaymentMethod } from '../../types';
import {
  calculateLoanSummary,
  formatCurrencyBRL,
  formatDateBR,
  getTodayISO,
  simulateLoanPayment,
} from '../../services/loanCalculator';

export interface RegisterLoanPaymentPayload {
  paymentType: LoanPaymentType;
  paymentDate: string;
  amount: number;
  notes?: string;
  postToCashFlow: boolean;
  accountId?: string;
  categoryId?: string;
  paymentMethodId?: string;
}

interface LoanPaymentModalProps {
  isOpen: boolean;
  loan: Loan | null;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  currency: string;
  onSubmit: (loan: Loan, payload: RegisterLoanPaymentPayload) => Promise<void>;
}

const PAYMENT_OPTIONS: {
  type: LoanPaymentType;
  title: string;
  description: string;
}[] = [
  {
    type: 'INTEREST_ONLY',
    title: 'Pagamento de Juros',
    description: 'Quita encargos + juros do ciclo e renova por +30 dias.',
  },
  {
    type: 'INTEREST_AND_AMORTIZATION',
    title: 'Juros + Amortização',
    description: 'Quita encargos + juros, abate parte do capital e renova +30 dias.',
  },
  {
    type: 'EARLY_AMORTIZATION',
    title: 'Amortização Antecipada',
    description: 'Reduz o capital agora; novos juros valem a partir do próximo ciclo.',
  },
  {
    type: 'FULL_SETTLEMENT',
    title: 'Quitação Total',
    description: 'Encerra o empréstimo pagando saldo devedor + juros + encargos.',
  },
];

export const LoanPaymentModal: React.FC<LoanPaymentModalProps> = ({
  isOpen,
  loan,
  onClose,
  accounts,
  categories,
  paymentMethods,
  currency,
  onSubmit,
}) => {
  const [paymentType, setPaymentType] = useState<LoanPaymentType>('INTEREST_ONLY');
  const [paymentDate, setPaymentDate] = useState(getTodayISO());
  const [amountStr, setAmountStr] = useState('');
  const [notes, setNotes] = useState('');
  const [postToCashFlow, setPostToCashFlow] = useState(true);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    if (!loan) return null;
    return calculateLoanSummary(loan, paymentDate);
  }, [loan, paymentDate]);

  useEffect(() => {
    if (isOpen && loan) {
      const today = getTodayISO();
      const s = calculateLoanSummary(loan, today);
      setPaymentType('INTEREST_ONLY');
      setPaymentDate(today);
      setAmountStr(String(s.renewalAmount));
      setNotes('');
      setPostToCashFlow(accounts.length > 0);
      setAccountId(loan.accountId || accounts[0]?.id || '');
      setCategoryId('');
      setPaymentMethodId('');
      setError(null);
    }
  }, [isOpen, loan, accounts]);

  // Atualiza valor sugerido ao trocar tipo de pagamento ou data
  useEffect(() => {
    if (!summary) return;
    if (paymentType === 'INTEREST_ONLY') {
      setAmountStr(String(summary.renewalAmount));
    } else if (paymentType === 'FULL_SETTLEMENT') {
      setAmountStr(String(summary.totalPayoffAmount));
    } else if (paymentType === 'INTEREST_AND_AMORTIZATION') {
      const currentVal = parseFloat(amountStr.replace(',', '.')) || 0;
      if (currentVal <= summary.renewalAmount) {
        const suggested = Math.min(
          summary.totalPayoffAmount,
          summary.renewalAmount + Math.min(loan?.currentPrincipal || 0, 1000),
        );
        setAmountStr(String(Number(suggested.toFixed(2))));
      }
    } else if (paymentType === 'EARLY_AMORTIZATION') {
      const currentVal = parseFloat(amountStr.replace(',', '.')) || 0;
      if (currentVal <= 0 || currentVal >= (loan?.currentPrincipal || 0)) {
        const suggested = Math.min(
          (loan?.currentPrincipal || 0) / 2,
          1000,
        );
        setAmountStr(suggested > 0 ? String(Number(suggested.toFixed(2))) : '');
      }
    }
  }, [paymentType, paymentDate, summary?.renewalAmount, summary?.totalPayoffAmount]);

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'INCOME'),
    [categories],
  );

  const parsedAmount = parseFloat(amountStr.replace(',', '.')) || 0;

  const simulation = useMemo(() => {
    if (!loan) return null;
    return simulateLoanPayment(loan, paymentType, paymentDate, parsedAmount);
  }, [loan, paymentType, paymentDate, parsedAmount]);

  if (!isOpen || !loan || !summary || !simulation) return null;

  const isAmountLocked =
    paymentType === 'INTEREST_ONLY' || paymentType === 'FULL_SETTLEMENT';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!simulation.valid) {
      setError(simulation.error || 'Verifique os valores informados.');
      return;
    }
    if (postToCashFlow && !accountId) {
      setError('Selecione a conta bancária para lançar no fluxo de caixa.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(loan, {
        paymentType,
        paymentDate,
        amount: simulation.totalPaid,
        notes: notes.trim() || undefined,
        postToCashFlow,
        accountId: postToCashFlow ? accountId : undefined,
        categoryId: postToCashFlow && categoryId ? categoryId : undefined,
        paymentMethodId: postToCashFlow && paymentMethodId ? paymentMethodId : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao registrar pagamento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-gray-100">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Registrar Pagamento</h2>
            <p className="text-xs text-gray-500">
              Cliente: <span className="font-semibold text-gray-800">{loan.borrowerName}</span> · Vencimento atual: {formatDateBR(loan.dueDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Situação Atual na Data */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200/80">
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase">Saldo Devedor</p>
              <p className="text-sm font-bold text-gray-900">
                {formatCurrencyBRL(loan.currentPrincipal, currency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase">Juros do Ciclo</p>
              <p className="text-sm font-bold text-blue-700">
                {formatCurrencyBRL(summary.currentCycleInterest, currency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase">
                Atraso ({summary.daysOverdue}d)
              </p>
              <p className={`text-sm font-bold ${summary.accumulatedLateFee > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                {formatCurrencyBRL(summary.accumulatedLateFee, currency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase">Quitação Hoje</p>
              <p className="text-sm font-bold text-emerald-700">
                {formatCurrencyBRL(summary.totalPayoffAmount, currency)}
              </p>
            </div>
          </div>

          {/* Seleção da Modalidade */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Tipo de Operação
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PAYMENT_OPTIONS.map((opt) => {
                const selected = paymentType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setPaymentType(opt.type)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      selected
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-100'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <p className={`text-sm font-bold ${selected ? 'text-blue-900' : 'text-gray-800'}`}>
                      {opt.title}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data e Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Data do Pagamento
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {paymentType === 'EARLY_AMORTIZATION'
                  ? 'Valor da Amortização (R$)'
                  : 'Valor Total Recebido (R$)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                disabled={isAmountLocked}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 disabled:bg-gray-100 disabled:text-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>

          {/* Demonstrativo / Simulação */}
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              simulation.valid
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-amber-50/70 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Demonstrativo da Operação
              </span>
              {simulation.newStatus === 'PAID_OFF' && simulation.valid && (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-600 text-white">
                  Empréstimo será Quitado
                </span>
              )}
            </div>

            {!simulation.valid ? (
              <p className="text-xs font-medium text-amber-800">{simulation.error}</p>
            ) : (
              <>
                {/* Destinação do valor */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded-lg p-2.5 border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Encargos Atraso</p>
                    <p className="text-sm font-bold text-red-600 mt-0.5">
                      {formatCurrencyBRL(simulation.lateFeePaid, currency)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Juros do Ciclo</p>
                    <p className="text-sm font-bold text-blue-700 mt-0.5">
                      {formatCurrencyBRL(simulation.interestPaid, currency)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Amortização</p>
                    <p className="text-sm font-bold text-emerald-700 mt-0.5">
                      {formatCurrencyBRL(simulation.principalAmortized, currency)}
                    </p>
                  </div>
                </div>

                {/* Situação Pós-Pagamento */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/70 text-xs">
                  <div>
                    <span className="text-gray-500 block">Novo Saldo Devedor</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrencyBRL(simulation.principalAfter, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Próximos Juros (30d)</span>
                    <span className="font-bold text-blue-800">
                      {formatCurrencyBRL(simulation.nextCycleInterest, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">
                      {simulation.newStatus === 'PAID_OFF' ? 'Status Final' : 'Próximo Vencimento'}
                    </span>
                    <span className="font-bold text-gray-900">
                      {simulation.newStatus === 'PAID_OFF'
                        ? 'Quitado'
                        : formatDateBR(simulation.newDueDate)}
                    </span>
                  </div>
                </div>

                {paymentType === 'EARLY_AMORTIZATION' && (
                  <p className="text-[11px] text-gray-600 bg-white/80 rounded-lg p-2 border border-emerald-100">
                    Os juros do ciclo atual ({formatCurrencyBRL(summary.currentCycleInterest, currency)}) permanecem inalterados até{' '}
                    <strong>{formatDateBR(loan.dueDate)}</strong>. O novo valor de juros (
                    <strong>{formatCurrencyBRL(simulation.nextCycleInterest, currency)}</strong>) passará a valer no próximo ciclo de 30 dias.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Checkbox: Lançar no fluxo de caixa */}
          <div className="p-4 rounded-xl border border-gray-200 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={postToCashFlow}
                onChange={(e) => setPostToCashFlow(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-semibold text-gray-900">
                  Lançar no fluxo de caixa
                </span>
                <p className="text-xs text-gray-500">
                  Registra automaticamente uma entrada no valor total recebido na conta selecionada.
                </p>
              </div>
            </label>

            {postToCashFlow && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Conta de Entrada <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    required={postToCashFlow}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Categoria (Opcional)
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white outline-none focus:border-blue-500"
                  >
                    <option value="">Sem categoria</option>
                    {incomeCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Forma de Pgto (Opcional)
                  </label>
                  <select
                    value={paymentMethodId}
                    onChange={(e) => setPaymentMethodId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white outline-none focus:border-blue-500"
                  >
                    <option value="">Não informado</option>
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Observações do Pagamento
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pago via PIX, comprovante enviado..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !simulation.valid}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {submitting ? 'Registrando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
