import React, { useEffect, useMemo, useState } from 'react';
import { Transaction } from '../../types';

export type RecurrenceScope =
    | 'CURRENT'
    | 'CURRENT_AND_NEXT'
    | 'CURRENT_AND_PREVIOUS'
    | 'PREVIOUS'
    | 'NEXT'
    | 'ALL';

const SCOPE_OPTIONS: { value: RecurrenceScope; label: string }[] = [
    { value: 'CURRENT', label: 'Apenas este lançamento' },
    { value: 'CURRENT_AND_NEXT', label: 'Este e os próximos' },
    { value: 'CURRENT_AND_PREVIOUS', label: 'Este e os anteriores' },
    { value: 'NEXT', label: 'Apenas os próximos' },
    { value: 'PREVIOUS', label: 'Apenas os anteriores' },
    { value: 'ALL', label: 'Todos os lançamentos' },
];

const sortGroup = (a: Transaction, b: Transaction) => {
    if (a.installmentCurrent != null && b.installmentCurrent != null) {
        return a.installmentCurrent - b.installmentCurrent;
    }
    return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
};

export const getGroupTransactions = (all: Transaction[], target: Transaction): Transaction[] =>
    target.groupId ? all.filter(t => t.groupId === target.groupId).sort(sortGroup) : [target];

export const isGroupedTransaction = (all: Transaction[], target: Transaction): boolean =>
    getGroupTransactions(all, target).length > 1;

/** Returns `isoDate` (YYYY-MM-DD) with its day replaced, clamped to the month's last day. */
export const applyDayOfMonth = (isoDate: string, day: number): string => {
    const [y, m] = isoDate.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
};

export const getTransactionsByScope = (
    all: Transaction[],
    target: Transaction,
    scope: RecurrenceScope,
): Transaction[] => {
    const group = getGroupTransactions(all, target);
    const idx = group.findIndex(t => t.id === target.id);
    if (idx === -1) return [target];

    switch (scope) {
        case 'CURRENT': return [target];
        case 'CURRENT_AND_NEXT': return group.slice(idx);
        case 'CURRENT_AND_PREVIOUS': return group.slice(0, idx + 1);
        case 'NEXT': return group.slice(idx + 1);
        case 'PREVIOUS': return group.slice(0, idx);
        case 'ALL': return group;
    }
};

interface RecurrenceScopeModalProps {
    isOpen: boolean;
    action: 'edit' | 'delete';
    target: Transaction | null;
    transactions: Transaction[];
    onConfirm: (scope: RecurrenceScope) => void;
    onCancel: () => void;
}

export const RecurrenceScopeModal: React.FC<RecurrenceScopeModalProps> = ({
    isOpen,
    action,
    target,
    transactions,
    onConfirm,
    onCancel,
}) => {
    const [scope, setScope] = useState<RecurrenceScope>('CURRENT');

    useEffect(() => {
        if (isOpen) setScope('CURRENT');
    }, [isOpen]);

    const counts = useMemo(() => {
        if (!target) return {} as Record<RecurrenceScope, number>;
        return SCOPE_OPTIONS.reduce((acc, opt) => {
            acc[opt.value] = getTransactionsByScope(transactions, target, opt.value).length;
            return acc;
        }, {} as Record<RecurrenceScope, number>);
    }, [transactions, target]);

    if (!isOpen || !target) return null;

    const isDelete = action === 'delete';
    const isInstallment = target.recurringType === 'INSTALLMENT';
    const groupLabel = isInstallment
        ? `Parcela ${target.installmentCurrent ?? '?'}/${target.installmentTotal ?? '?'}`
        : 'Lançamento fixo mensal';

    const accent = isDelete
        ? { ring: 'border-rose-500 bg-rose-50/60', dot: 'border-rose-500 bg-rose-500', button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200', icon: 'bg-rose-50 text-rose-600' }
        : { ring: 'border-blue-500 bg-blue-50/60', dot: 'border-blue-500 bg-blue-500', button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200', icon: 'bg-blue-50 text-blue-600' };

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-fade-in">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="recurrence-scope-title"
                className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-scale-in flex flex-col border border-gray-100/50"
            >
                <div className="flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${accent.icon}`}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <h3 id="recurrence-scope-title" className="text-xl font-bold text-gray-800 mb-1">
                        {isDelete ? 'Excluir lançamento recorrente' : 'Editar lançamento recorrente'}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium mb-1 truncate max-w-full">"{target.description}"</p>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-6">{groupLabel}</span>
                </div>

                <div className="flex flex-col gap-2 mb-6" role="radiogroup">
                    {SCOPE_OPTIONS.map(opt => {
                        const count = counts[opt.value] ?? 0;
                        const disabled = count === 0;
                        const selected = scope === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                disabled={disabled}
                                onClick={() => setScope(opt.value)}
                                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-left transition-all
                                    ${selected ? accent.ring : 'border-gray-200 hover:border-gray-300'}
                                    ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <span className="flex items-center gap-3">
                                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected ? accent.dot : 'border-gray-300'}`}>
                                        {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-700">{opt.label}</span>
                                </span>
                                <span className="text-[11px] font-bold text-gray-400 tabular-nums">
                                    {count} {count === 1 ? 'registro' : 'registros'}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex gap-3 w-full">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={!counts[scope]}
                        onClick={() => onConfirm(scope)}
                        className={`flex-1 py-4 text-white rounded-2xl shadow-xl text-sm font-bold transition-all uppercase tracking-widest active:scale-95 disabled:opacity-50 ${accent.button}`}
                    >
                        {isDelete ? 'Excluir' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
