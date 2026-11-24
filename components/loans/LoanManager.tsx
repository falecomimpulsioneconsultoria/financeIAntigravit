import React, { useMemo, useState } from 'react';
import { Account, Category, Contact, Loan, PaymentMethod } from '../../types';
import {
  calculateLoanSummary,
  formatCurrencyBRL,
  formatDateBR,
  roundMoney,
} from '../../services/loanCalculator';
import { LoanFormModal, CreateLoanFormPayload } from './LoanFormModal';
import { LoanPaymentModal, RegisterLoanPaymentPayload } from './LoanPaymentModal';
import { LoanDetailModal } from './LoanDetailModal';

interface LoanManagerProps {
  loans: Loan[];
  contacts: Contact[];
  accounts: Account[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  currency: string;
  onCreateLoan: (payload: CreateLoanFormPayload) => Promise<void>;
  onRegisterPayment: (loan: Loan, payload: RegisterLoanPaymentPayload) => Promise<void>;
  onDeleteLoan: (loan: Loan) => void;
}

type StatusFilter = 'ALL' | 'ON_TIME' | 'DUE_TODAY' | 'OVERDUE' | 'PAID_OFF';

export const LoanManager: React.FC<LoanManagerProps> = ({
  loans,
  contacts,
  accounts,
  categories,
  paymentMethods,
  currency,
  onCreateLoan,
  onRegisterPayment,
  onDeleteLoan,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [paymentLoan, setPaymentLoan] = useState<Loan | null>(null);
  const [detailLoanId, setDetailLoanId] = useState<string | null>(null);

  const enrichedLoans = useMemo(() => {
    return loans.map((loan) => ({
      loan,
      summary: calculateLoanSummary(loan),
    }));
  }, [loans]);

  const kpis = useMemo(() => {
    let activePrincipal = 0;
    let overdueCount = 0;
    let overdueTotalDebt = 0;
    let totalInterestReceived = 0;
    let totalAmortized = 0;

    for (const { loan, summary } of enrichedLoans) {
      totalInterestReceived += summary.totalInterestPaid + summary.totalLateFeesPaid;
      totalAmortized += summary.totalPrincipalAmortized;
      if (loan.status === 'ACTIVE') {
        activePrincipal += loan.currentPrincipal;
        if (summary.isOverdue) {
          overdueCount += 1;
          overdueTotalDebt += summary.totalPayoffAmount;
        }
      }
    }

    return {
      activePrincipal: roundMoney(activePrincipal),
      overdueCount,
      overdueTotalDebt: roundMoney(overdueTotalDebt),
      totalInterestReceived: roundMoney(totalInterestReceived),
      totalAmortized: roundMoney(totalAmortized),
    };
  }, [enrichedLoans]);

  const filteredLoans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedLoans.filter(({ loan, summary }) => {
      if (statusFilter === 'PAID_OFF' && loan.status !== 'PAID_OFF') return false;
      if (statusFilter === 'OVERDUE' && (loan.status !== 'ACTIVE' || !summary.isOverdue)) return false;
      if (statusFilter === 'DUE_TODAY' && (loan.status !== 'ACTIVE' || !summary.isDueToday)) return false;
      if (statusFilter === 'ON_TIME' && (loan.status !== 'ACTIVE' || summary.isOverdue || summary.isDueToday)) return false;

      if (!q) return true;
      return (
        loan.borrowerName.toLowerCase().includes(q) ||
        (loan.notes || '').toLowerCase().includes(q)
      );
    });
  }, [enrichedLoans, search, statusFilter]);

  const detailLoan = useMemo(
    () => loans.find((l) => l.id === detailLoanId) || null,
    [loans, detailLoanId],
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Controle de Empréstimos
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestão de capital emprestado, juros de 30 dias, renovações, atrasos e amortizações.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Empréstimo
        </button>
      </div>

      {/* Cards KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Capital Ativo (Saldo Devedor)
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrencyBRL(kpis.activePrincipal, currency)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {loans.filter((l) => l.status === 'ACTIVE').length} contratos ativos
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Em Atraso
          </p>
          <p className={`text-2xl font-bold mt-2 ${kpis.overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrencyBRL(kpis.overdueTotalDebt, currency)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {kpis.overdueCount} {kpis.overdueCount === 1 ? 'contrato vencido' : 'contratos vencidos'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Juros + Encargos Recebidos
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {formatCurrencyBRL(kpis.totalInterestReceived, currency)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Acumulado histórico</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Capital Amortizado
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {formatCurrencyBRL(kpis.totalAmortized, currency)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Retornado ao caixa</p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou observação..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'ALL', label: 'Todos' },
              { id: 'ON_TIME', label: 'Em dia' },
              { id: 'DUE_TODAY', label: 'Vence hoje' },
              { id: 'OVERDUE', label: 'Em atraso' },
              { id: 'PAID_OFF', label: 'Quitados' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === f.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista / Tabela */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredLoans.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-base font-semibold text-gray-700">
              Nenhum empréstimo encontrado
            </p>
            <p className="text-sm text-gray-400">
              Clique em &quot;Novo Empréstimo&quot; para cadastrar o primeiro contrato.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4 text-right">Capital / Saldo</th>
                  <th className="py-3.5 px-4 text-right">Juros (30d)</th>
                  <th className="py-3.5 px-4 text-center">Vencimento</th>
                  <th className="py-3.5 px-4 text-right">Quitação Atual</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredLoans.map(({ loan, summary }) => (
                  <tr key={loan.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => setDetailLoanId(loan.id)}
                        className="text-left group"
                      >
                        <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {loan.borrowerName}
                        </p>
                        <p className="text-xs text-gray-400">
                          Início: {formatDateBR(loan.startDate)} · {loan.renewalsCount}{' '}
                          {loan.renewalsCount === 1 ? 'renovação' : 'renovações'}
                        </p>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <p className="font-bold text-gray-900">
                        {formatCurrencyBRL(loan.currentPrincipal, currency)}
                      </p>
                      {loan.currentPrincipal !== loan.originalPrincipal && (
                        <p className="text-[11px] text-gray-400">
                          Orig: {formatCurrencyBRL(loan.originalPrincipal, currency)}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <p className="font-semibold text-blue-700">
                        {formatCurrencyBRL(summary.currentCycleInterest, currency)}
                      </p>
                      <p className="text-[11px] text-gray-400">{loan.interestRate}% / 30d</p>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <p className="font-semibold text-gray-800">
                        {loan.status === 'PAID_OFF'
                          ? formatDateBR(loan.paidOffAt || loan.dueDate)
                          : formatDateBR(loan.dueDate)}
                      </p>
                      {loan.status === 'ACTIVE' && summary.accumulatedLateFee > 0 && (
                        <p className="text-[11px] font-semibold text-red-600">
                          +{formatCurrencyBRL(summary.accumulatedLateFee, currency)} atraso
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <p className="font-bold text-emerald-700">
                        {loan.status === 'PAID_OFF'
                          ? 'Quitado'
                          : formatCurrencyBRL(summary.totalPayoffAmount, currency)}
                      </p>
                      {loan.status === 'ACTIVE' && (
                        <p className="text-[11px] text-gray-400">
                          Renovar: {formatCurrencyBRL(summary.renewalAmount, currency)}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {loan.status === 'PAID_OFF' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                          Quitado
                        </span>
                      ) : summary.isOverdue ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                          Atrasado {summary.daysOverdue}d
                        </span>
                      ) : summary.isDueToday ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          Vence hoje
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                          Em dia ({summary.daysUntilDue}d)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {loan.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => setPaymentLoan(loan)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                          >
                            Pagar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDetailLoanId(loan.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          Extrato
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteLoan(loan)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Excluir empréstimo"
                          aria-label="Excluir empréstimo"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais */}
      <LoanFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        contacts={contacts}
        accounts={accounts}
        categories={categories}
        paymentMethods={paymentMethods}
        currency={currency}
        onSubmit={onCreateLoan}
      />

      <LoanPaymentModal
        isOpen={Boolean(paymentLoan)}
        loan={paymentLoan}
        onClose={() => setPaymentLoan(null)}
        accounts={accounts}
        categories={categories}
        paymentMethods={paymentMethods}
        currency={currency}
        onSubmit={onRegisterPayment}
      />

      <LoanDetailModal
        isOpen={Boolean(detailLoan)}
        loan={detailLoan}
        currency={currency}
        onClose={() => setDetailLoanId(null)}
        onRegisterPayment={(loan) => setPaymentLoan(loan)}
      />
    </div>
  );
};
