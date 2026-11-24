import React, { useState, useMemo, useEffect } from 'react';
import { Account, Category, Contact, LoanLateFeeType, PaymentMethod } from '../../types';
import { ContactAutocomplete } from '../contacts/ContactAutocomplete';
import {
  addDaysISO,
  formatCurrencyBRL,
  formatDateBR,
  getTodayISO,
  roundMoney,
} from '../../services/loanCalculator';

export interface CreateLoanFormPayload {
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
}

interface LoanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  accounts: Account[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  currency: string;
  onSubmit: (payload: CreateLoanFormPayload) => Promise<void>;
}

export const LoanFormModal: React.FC<LoanFormModalProps> = ({
  isOpen,
  onClose,
  contacts,
  accounts,
  categories,
  paymentMethods,
  currency,
  onSubmit,
}) => {
  const [contactId, setContactId] = useState('');
  const [customBorrowerName, setCustomBorrowerName] = useState('');
  const [principalStr, setPrincipalStr] = useState('');
  const [interestRateStr, setInterestRateStr] = useState('10');
  const [lateFeeType, setLateFeeType] = useState<LoanLateFeeType>('PERCENTAGE');
  const [lateFeeValueStr, setLateFeeValueStr] = useState('0.5');
  const [startDate, setStartDate] = useState(getTodayISO());
  const [notes, setNotes] = useState('');
  const [postToCashFlow, setPostToCashFlow] = useState(true);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setContactId('');
      setCustomBorrowerName('');
      setPrincipalStr('');
      setInterestRateStr('10');
      setLateFeeType('PERCENTAGE');
      setLateFeeValueStr('0.5');
      setStartDate(getTodayISO());
      setNotes('');
      setPostToCashFlow(accounts.length > 0);
      setAccountId(accounts[0]?.id || '');
      setCategoryId('');
      setPaymentMethodId('');
      setError(null);
    }
  }, [isOpen, accounts]);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === contactId),
    [contacts, contactId],
  );

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'EXPENSE'),
    [categories],
  );

  const principal = parseFloat(principalStr.replace(',', '.')) || 0;
  const interestRate = parseFloat(interestRateStr.replace(',', '.')) || 0;
  const lateFeeValue = parseFloat(lateFeeValueStr.replace(',', '.')) || 0;

  const firstDueDate = useMemo(() => addDaysISO(startDate, 30), [startDate]);
  const firstCycleInterest = useMemo(
    () => roundMoney(principal * (interestRate / 100)),
    [principal, interestRate],
  );
  const dailyLateFeePreview = useMemo(() => {
    if (lateFeeType === 'FIXED') return roundMoney(lateFeeValue);
    return roundMoney(principal * (lateFeeValue / 100));
  }, [lateFeeType, lateFeeValue, principal]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const borrowerName = selectedContact?.fantasyName || customBorrowerName.trim();
    if (!borrowerName) {
      setError('Selecione um cliente ou informe o nome do tomador.');
      return;
    }
    if (principal <= 0) {
      setError('Informe um valor de capital maior que zero.');
      return;
    }
    if (interestRate < 0) {
      setError('A taxa de juros não pode ser negativa.');
      return;
    }
    if (lateFeeValue < 0) {
      setError('A taxa diária de atraso não pode ser negativa.');
      return;
    }
    if (postToCashFlow && !accountId) {
      setError('Selecione a conta bancária para lançar no fluxo de caixa.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        contactId: contactId || undefined,
        borrowerName,
        originalPrincipal: principal,
        interestRate,
        lateFeeType,
        lateFeeValue,
        startDate,
        notes: notes.trim() || undefined,
        postToCashFlow,
        accountId: postToCashFlow ? accountId : undefined,
        categoryId: postToCashFlow && categoryId ? categoryId : undefined,
        paymentMethodId: postToCashFlow && paymentMethodId ? paymentMethodId : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao cadastrar empréstimo.');
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
            <h2 className="text-lg font-bold text-gray-900">Novo Empréstimo</h2>
            <p className="text-xs text-gray-500">
              Ciclo de 30 dias com renovação, encargos diários por atraso e amortização
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

          {/* Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <ContactAutocomplete
                contacts={contacts}
                value={contactId}
                onChange={(id) => {
                  setContactId(id);
                  if (id) setCustomBorrowerName('');
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Ou nome avulso {!contactId && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={selectedContact ? selectedContact.fantasyName : customBorrowerName}
                disabled={Boolean(selectedContact)}
                onChange={(e) => setCustomBorrowerName(e.target.value)}
                placeholder="Nome do cliente caso não cadastrado"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 disabled:bg-gray-50 disabled:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>

          {/* Capital, Juros e Data Inicial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Capital Emprestado (R$) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={principalStr}
                onChange={(e) => setPrincipalStr(e.target.value)}
                placeholder="10000.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Juros a cada 30 dias (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={interestRateStr}
                onChange={(e) => setInterestRateStr(e.target.value)}
                placeholder="10"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Data do Empréstimo <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>

          {/* Regra de Atraso Diário */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Encargo Diário por Atraso
              </span>
              <div className="inline-flex rounded-lg bg-white border border-gray-200 p-0.5">
                <button
                  type="button"
                  onClick={() => setLateFeeType('PERCENTAGE')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    lateFeeType === 'PERCENTAGE'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Percentual (% / dia)
                </button>
                <button
                  type="button"
                  onClick={() => setLateFeeType('FIXED')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    lateFeeType === 'FIXED'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Valor Fixo (R$ / dia)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={lateFeeValueStr}
                  onChange={(e) => setLateFeeValueStr(e.target.value)}
                  placeholder={lateFeeType === 'PERCENTAGE' ? '0.5' : '25.00'}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <p className="text-xs text-gray-600">
                Equivalente a{' '}
                <span className="font-bold text-amber-700">
                  {formatCurrencyBRL(dailyLateFeePreview, currency)} / dia
                </span>{' '}
                de atraso sobre o saldo atual.
              </p>
            </div>
          </div>

          {/* Prévia do Primeiro Ciclo */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] font-semibold text-blue-700 uppercase">1º Vencimento (+30d)</p>
              <p className="text-sm font-bold text-blue-950 mt-0.5">{formatDateBR(firstDueDate)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-blue-700 uppercase">Juros do 1º Ciclo</p>
              <p className="text-sm font-bold text-blue-950 mt-0.5">
                {formatCurrencyBRL(firstCycleInterest, currency)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-blue-700 uppercase">Quitação no 1º Venc.</p>
              <p className="text-sm font-bold text-blue-950 mt-0.5">
                {formatCurrencyBRL(roundMoney(principal + firstCycleInterest), currency)}
              </p>
            </div>
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
                  Registra automaticamente uma saída no valor do capital emprestado na conta selecionada.
                </p>
              </div>
            </label>

            {postToCashFlow && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Conta de Saída <span className="text-red-500">*</span>
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
                    {expenseCategories.map((cat) => (
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
              Observações / Garantias
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes do acordo, garantias ou observações..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
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
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {submitting ? 'Salvando...' : 'Criar Empréstimo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
