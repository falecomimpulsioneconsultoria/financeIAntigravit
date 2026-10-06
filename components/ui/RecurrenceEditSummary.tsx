import React from 'react';
import { Account, Category, Contact, PaymentMethod, Transaction, TransactionType } from '../../types';

interface RecurrenceEditSummaryProps {
    original: Transaction;
    payload: Omit<Transaction, 'id'>;
    affected: Transaction[];
    accounts: Account[];
    categories: Category[];
    paymentMethods: PaymentMethod[];
    contacts: Contact[];
    currency?: string;
}

const TYPE_LABELS: Record<TransactionType, string> = {
    INCOME: 'Receita',
    EXPENSE: 'Despesa',
    TRANSFER: 'Transferência',
};

const STATUS_LABELS: Record<string, string> = { PAID: 'Pago', PENDING: 'Pendente' };

const formatMonth = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const formatDate = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');

export const RecurrenceEditSummary: React.FC<RecurrenceEditSummaryProps> = ({
    original,
    payload,
    affected,
    accounts,
    categories,
    paymentMethods,
    contacts,
    currency = 'BRL',
}) => {
    const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(v || 0);
    const nameOf = <T extends { id: string }>(list: T[], id: string | undefined, get: (item: T) => string) =>
        (id && list.find(i => i.id === id) ? get(list.find(i => i.id === id)!) : '—');

    const sharedChanges = [
        { label: 'Descrição', from: original.description, to: payload.description },
        { label: 'Valor', from: money(original.amount), to: money(payload.amount) },
        { label: 'Tipo', from: TYPE_LABELS[original.type], to: TYPE_LABELS[payload.type] },
        { label: 'Categoria', from: nameOf(categories, original.categoryId, c => c.name), to: nameOf(categories, payload.categoryId, c => c.name) },
        { label: 'Conta', from: nameOf(accounts, original.accountId, a => a.name), to: nameOf(accounts, payload.accountId, a => a.name) },
        { label: 'Conta destino', from: nameOf(accounts, original.toAccountId, a => a.name), to: nameOf(accounts, payload.toAccountId, a => a.name) },
        { label: 'Forma de pagamento', from: nameOf(paymentMethods, original.paymentMethodId, p => p.name), to: nameOf(paymentMethods, payload.paymentMethodId, p => p.name) },
        { label: 'Pessoa / Fornecedor', from: nameOf(contacts, original.contactId, c => c.fantasyName), to: nameOf(contacts, payload.contactId, c => c.fantasyName) },
        { label: 'Observação', from: original.observation || '—', to: payload.observation || '—' },
        { label: 'Dia do vencimento', from: `dia ${original.date.slice(8, 10)}`, to: `dia ${payload.date.slice(8, 10)}` },
    ].filter(c => c.from !== c.to);

    const includesCurrent = affected.some(t => t.id === original.id);
    const currentOnlyChanges = includesCurrent
        ? [
            { label: 'Data', from: formatDate(original.date), to: formatDate(payload.date) },
            { label: 'Status', from: STATUS_LABELS[original.status] ?? original.status, to: STATUS_LABELS[payload.status] ?? payload.status },
            { label: 'Data de pagamento', from: formatDate(original.paymentDate), to: formatDate(payload.paymentDate) },
        ].filter(c => c.from !== c.to && !(c.label === 'Data' && original.date.slice(0, 7) === payload.date.slice(0, 7)))
        : [];

    const first = affected[0];
    const last = affected[affected.length - 1];
    const isInstallment = original.recurringType === 'INSTALLMENT' && first?.installmentCurrent != null;
    const rangeLabel = !first
        ? ''
        : isInstallment
            ? affected.length === 1
                ? `parcela ${first.installmentCurrent}/${first.installmentTotal}`
                : `parcelas ${first.installmentCurrent} a ${last.installmentCurrent} de ${first.installmentTotal}`
            : affected.length === 1
                ? formatMonth(first.date)
                : `${formatMonth(first.date)} a ${formatMonth(last.date)}`;

    const renderList = (items: { label: string; from: string; to: string }[]) => (
        <ul className="flex flex-col gap-1.5">
            {items.map(c => (
                <li key={c.label} className="text-xs leading-snug">
                    <span className="font-bold text-gray-700">{c.label}: </span>
                    <span className="text-gray-400 line-through">{c.from}</span>
                    <span className="text-gray-400 mx-1">→</span>
                    <span className="font-semibold text-blue-600">{c.to}</span>
                </li>
            ))}
        </ul>
    );

    return (
        <div className="flex flex-col gap-4 text-left w-full">
            <p className="text-sm text-gray-600 text-center">
                Serão alterados <strong className="text-gray-800">{affected.length} {affected.length === 1 ? 'lançamento' : 'lançamentos'}</strong> de
                "<strong className="text-gray-800">{original.description}</strong>" ({rangeLabel}).
            </p>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <span className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">
                    {affected.length > 1 ? 'Alterações em todos os selecionados' : 'Alterações'}
                </span>
                {sharedChanges.length > 0
                    ? renderList(sharedChanges)
                    : <p className="text-xs text-gray-500">Nenhum campo compartilhado foi alterado.</p>}
            </div>

            {currentOnlyChanges.length > 0 && (
                <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-100">
                    <span className="block text-[10px] uppercase tracking-widest font-bold text-amber-600 mb-2">
                        Somente neste lançamento
                    </span>
                    {renderList(currentOnlyChanges)}
                </div>
            )}

            {affected.length > 1 && (
                <p className="text-[11px] text-gray-400 text-center">
                    Status e data de pagamento dos demais registros não serão alterados.
                </p>
            )}
        </div>
    );
};
