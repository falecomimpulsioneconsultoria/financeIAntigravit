import React, { useMemo, useState } from 'react';
import { Loan } from '../../types';
import {
  calculateLoanSummary,
  formatCurrencyBRL,
  formatDateBR,
  LOAN_PAYMENT_TYPE_LABELS,
} from '../../services/loanCalculator';

interface LoanDetailModalProps {
  isOpen: boolean;
  loan: Loan | null;
  currency: string;
  onClose: () => void;
  onRegisterPayment: (loan: Loan) => void;
}

type HistoryFilter = 'ALL' | 'INTEREST' | 'AMORTIZATION' | 'LATE_FEE';

export const LoanDetailModal: React.FC<LoanDetailModalProps> = ({
  isOpen,
  loan,
  currency,
  onClose,
  onRegisterPayment,
}) => {
  const [filter, setFilter] = useState<HistoryFilter>('ALL');

  const summary = useMemo(() => {
    if (!loan) return null;
    return calculateLoanSummary(loan);
  }, [loan]);

  const filteredPayments = useMemo(() => {
    const list = loan?.payments || [];
    if (filter === 'INTEREST') return list.filter((p) => p.interestPaid > 0);
    if (filter === 'AMORTIZATION') return list.filter((p) => p.principalAmortized > 0);
    if (filter === 'LATE_FEE') return list.filter((p) => p.lateFeePaid > 0);
    return list;
  }, [loan, filter]);

  if (!isOpen || !loan || !summary) return null;

  const amortizedPercent =
    loan.originalPrincipal > 0
      ? Math.min(
          100,
          Math.round(
            ((loan.originalPrincipal - loan.currentPrincipal) /
              loan.originalPrincipal) *
              100,
          ),
        )
      : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto border border-gray-100">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {loan.borrowerName}
              </h2>
              {loan.status === 'PAID_OFF' ? (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700">
                  Quitado
                </span>
              ) : summary.isOverdue ? (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700">
                  Em atraso ({summary.daysOverdue}d)
                </span>
              ) : summary.isDueToday ? (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
                  Vence hoje
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
                  Em dia
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Início: {formatDateBR(loan.startDate)} · Juros: {loan.interestRate}% / 30 dias · Atraso:{' '}
              {loan.lateFeeType === 'FIXED'
                ? `${formatCurrencyBRL(loan.lateFeeValue, currency)}/dia`
                : `${loan.lateFeeValue}%/dia (${formatCurrencyBRL(summary.dailyLateFee, currency)}/dia)`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {loan.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRegisterPayment(loan);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                Registrar Pagamento
              </button>
            )}
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
        </div>

        <div className="p-6 space-y-6">
          {/* Progresso de Amortização */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-600">
                Amortização do Capital Principal
              </span>
              <span className="font-bold text-gray-900">{amortizedPercent}% amortizado</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${amortizedPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Original: <strong className="text-gray-800">{formatCurrencyBRL(loan.originalPrincipal, currency)}</strong>
              </span>
              <span>
                Saldo Devedor Atual: <strong className="text-gray-900">{formatCurrencyBRL(loan.currentPrincipal, currency)}</strong>
              </span>
            </div>
          </div>

          {/* Demonstrativo Atual da Dívida */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-gray-200 bg-white">
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Juros Ciclo Atual</p>
              <p className="text-base font-bold text-blue-700 mt-1">
                {formatCurrencyBRL(summary.currentCycleInterest, currency)}
              </p>
              {loan.cyclePrincipal !== loan.currentPrincipal && loan.status === 'ACTIVE' && (
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Próximo ciclo: {formatCurrencyBRL(summary.nextCycleInterest, currency)}
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200 bg-white">
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Encargos de Atraso</p>
              <p className={`text-base font-bold mt-1 ${summary.accumulatedLateFee > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                {formatCurrencyBRL(summary.accumulatedLateFee, currency)}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {summary.daysOverdue > 0
                  ? `${summary.daysOverdue} dias × ${formatCurrencyBRL(summary.dailyLateFee, currency)}`
                  : 'Sem atraso'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200 bg-white">
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Vencimento / Renovações</p>
              <p className="text-base font-bold text-gray-900 mt-1">
                {loan.status === 'PAID_OFF'
                  ? formatDateBR(loan.paidOffAt || loan.dueDate)
                  : formatDateBR(loan.dueDate)}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {loan.renewalsCount} {loan.renewalsCount === 1 ? 'renovação' : 'renovações'}
                {loan.status === 'ACTIVE' ? ` · Próx: ${formatDateBR(summary.nextDueDateIfRenewed)}` : ''}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
              <p className="text-[11px] font-semibold text-emerald-700 uppercase">Quitação Atualizada</p>
              <p className="text-base font-bold text-emerald-800 mt-1">
                {formatCurrencyBRL(summary.totalPayoffAmount, currency)}
              </p>
              <p className="text-[10px] text-emerald-700/80 mt-0.5">
                Renovação: {formatCurrencyBRL(summary.renewalAmount, currency)}
              </p>
            </div>
          </div>

          {/* Totais Históricos Pagos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
            <div>
              <p className="text-[10px] font-semibold text-blue-700 uppercase">Total Pago em Juros</p>
              <p className="text-sm font-bold text-blue-950 mt-0.5">
                {formatCurrencyBRL(summary.totalInterestPaid, currency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-blue-700 uppercase">Total Amortizado</p>
              <p className="text-sm font-bold text-emerald-700 mt-0.5">
                {formatCurrencyBRL(summary.totalPrincipalAmortized, currency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-blue-700 uppercase">Encargos Pagos</p>
              <p className="text-sm font-bold text-red-700 mt-0.5">
                {formatCurrencyBRL(summary.totalLateFeesPaid, currency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-blue-700 uppercase">Total Geral Recebido</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {formatCurrencyBRL(summary.totalPaidOverall, currency)}
              </p>
            </div>
          </div>

          {loan.notes && (
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700">
              <span className="font-semibold text-gray-500 uppercase block mb-1">Observações</span>
              {loan.notes}
            </div>
          )}

          {/* Histórico de Operações */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-sm font-bold text-gray-900">
                Histórico Financeiro ({filteredPayments.length})
              </h3>
              <div className="inline-flex rounded-xl bg-gray-100 p-1 gap-1">
                {(
                  [
                    { id: 'ALL', label: 'Todos' },
                    { id: 'INTEREST', label: 'Juros' },
                    { id: 'AMORTIZATION', label: 'Amortizações' },
                    { id: 'LATE_FEE', label: 'Encargos' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      filter === tab.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-400">
                Nenhum pagamento registrado neste filtro ainda.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b border-gray-200">
                      <th className="py-2.5 px-3 font-semibold">Data</th>
                      <th className="py-2.5 px-3 font-semibold">Operação</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Encargos</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Juros</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Amortização</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Total Pago</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Saldo Após</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Vencimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/70">
                        <td className="py-2.5 px-3 font-medium text-gray-800 whitespace-nowrap">
                          {formatDateBR(p.paymentDate)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-gray-800 block">
                            {LOAN_PAYMENT_TYPE_LABELS[p.paymentType]}
                          </span>
                          {p.notes && (
                            <span className="text-[10px] text-gray-400 block truncate max-w-[180px]">
                              {p.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-red-600 whitespace-nowrap">
                          {p.lateFeePaid > 0 ? formatCurrencyBRL(p.lateFeePaid, currency) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-blue-700 whitespace-nowrap">
                          {p.interestPaid > 0 ? formatCurrencyBRL(p.interestPaid, currency) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-700 whitespace-nowrap">
                          {p.principalAmortized > 0 ? formatCurrencyBRL(p.principalAmortized, currency) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                          {formatCurrencyBRL(p.totalPaid, currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-gray-700 whitespace-nowrap">
                          {formatCurrencyBRL(p.principalAfter, currency)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-gray-500 whitespace-nowrap">
                          {p.previousDueDate !== p.newDueDate
                            ? `${formatDateBR(p.previousDueDate)} → ${formatDateBR(p.newDueDate)}`
                            : formatDateBR(p.newDueDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
