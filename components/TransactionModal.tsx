import React, { useState, useEffect } from 'react';
import { Transaction, Account, Category, TransactionType, RecurrenceType, PaymentMethod } from '../types';
import { Button } from './ui/Button';

interface TransactionFormData extends Omit<Transaction, 'id'> {
    recurrenceCount?: number;
    file?: File;
}

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: Account[];
    categories: Category[];
    paymentMethods?: PaymentMethod[];
    initialData?: Transaction | null;
    initialType?: TransactionType;
    currency?: string;
    availableTags?: string[];
    onSubmit: (data: TransactionFormData) => void;
}

export function TransactionModal({
    isOpen,
    onClose,
    accounts,
    categories,
    paymentMethods = [],
    initialData,
    initialType = 'EXPENSE',
    currency = 'BRL',
    availableTags = [],
    onSubmit,
}: TransactionModalProps) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    // ... rest of state unchanged until render ...

    // Helper to format display
    const formatDisplayAmount = (val: string) => {
        if (!val) return { integer: '0', fraction: '00', symbol: currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : '€' };

        // Simulating currency locale formatting
        const num = parseFloat(val);
        if (isNaN(num)) return { integer: '0', fraction: '00', symbol: '' };

        const parts = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).formatToParts(num);

        const symbol = parts.find(p => p.type === 'currency')?.value || '';
        const integer = parts.filter(p => p.type === 'integer' || p.type === 'group').map(p => p.value).join('');
        const fraction = parts.find(p => p.type === 'fraction')?.value || '00';

        return { integer, fraction, symbol };
    };

    const display = formatDisplayAmount(amount);

    // ... (keep useEffect and other handlers same) ...
    // Note: I am rewriting the top part to inject props, but for the render part I need to target the Input specifically.
    // Instead of replacing the whole file, I will target the PROPS definition first, then the Input.
    // Since this tool replaces a block, I should check line numbers carefully.
    // The previous ViewFile showed lines 1-395.
    // Props are at lines 10-19. Component def at 21.
    // Input is at 201-216.

    // I will return EARLY from this tool call because I need MULTI-REPLACE to do this safely without rewriting the large logic block in between.
    // I will use multi_replace for this.

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<TransactionType>(initialType);
    const [categoryId, setCategoryId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [paymentMethodId, setPaymentMethodId] = useState('');
    const [status, setStatus] = useState<'PAID' | 'PENDING'>('PAID');
    const [observation, setObservation] = useState('');

    // Recurrence & Expansion
    const [isExpanded, setIsExpanded] = useState(false);
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringType, setRecurringType] = useState<RecurrenceType>('FIXED');
    const [recurrenceCount, setRecurrenceCount] = useState(12);

    // Tags & Receipt
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isEditing, setIsEditing] = useState(!initialData);
    const [showReceiptPreview, setShowReceiptPreview] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [categorySearch, setCategorySearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setDescription(initialData.description);
                setAmount(initialData.amount.toString());
                setDate(initialData.date);
                setPaymentDate(initialData.paymentDate || initialData.date);
                setType(initialData.type);
                setCategoryId(initialData.categoryId || '');
                setAccountId(initialData.accountId);
                setToAccountId(initialData.toAccountId || '');
                setPaymentMethodId(initialData.paymentMethodId || '');
                setStatus(initialData.status);
                setObservation(initialData.observation || '');
                setIsRecurring(initialData.isRecurring);
                if (initialData.recurringType) setRecurringType(initialData.recurringType);
                if (initialData.tags) setTags(initialData.tags);
                if (initialData.isRecurring || initialData.tags?.length || initialData.observation || initialData.receiptUrl) {
                    setIsExpanded(true);
                }
                setIsEditing(false); // Default to View Mode
            } else {
                resetForm();
                setType(initialType);
                setIsExpanded(false);
                setIsEditing(true); // Default to Edit Mode
            }
        }
    }, [isOpen, initialData, initialType]);

    const resetForm = () => {
        setDescription('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setCategoryId('');
        setAccountId('');
        setToAccountId('');
        setPaymentMethodId('');
        setStatus('PAID');
        setObservation('');
        setIsRecurring(false);
        setRecurringType('FIXED');
        setRecurrenceCount(12);
        setTags([]);
        setTagInput('');
        setReceiptFile(null);
    };

    const addTag = (tag: string) => {
        const trimmedTag = tag.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            setTags([...tags, trimmedTag]);
        }
        setTagInput('');
    };

    const handleAddTag = () => {
        addTag(tagInput);
    };

    const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            description,
            amount: parseFloat(amount),
            date,
            paymentDate: status === 'PAID' ? paymentDate : undefined,
            type,
            categoryId: type === 'TRANSFER' ? 'transfer_internal' : categoryId,
            accountId,
            toAccountId: type === 'TRANSFER' ? toAccountId : undefined,
            paymentMethodId: paymentMethodId || undefined,
            status,
            observation,
            tags,
            isRecurring,
            recurringType: isRecurring ? recurringType : undefined,
            recurrenceCount: (isRecurring && recurringType === 'INSTALLMENT') ? recurrenceCount : undefined,
            file: receiptFile || undefined,
            parentId: initialData?.parentId
        });
        onClose();
    };

    const renderCategoryOptions = () => {
        const filtered = categories.filter(c => c.type === type);
        const parents = filtered.filter(c => !c.parentId);
        return parents.map(parent => {
            const children = filtered.filter(c => c.parentId === parent.id);
            return (
                <React.Fragment key={parent.id}>
                    <option value={parent.id} className="font-semibold text-gray-900">{parent.name}</option>
                    {children.map(child => (
                        <option key={child.id} value={child.id} className="text-gray-600">&nbsp;&nbsp;↳ {child.name}</option>
                    ))}
                </React.Fragment>
            );
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div
                className={`bg-white rounded-2xl shadow-2xl transform transition-all duration-300 ease-in-out flex flex-col md:flex-row overflow-hidden
                    ${isExpanded && isEditing ? 'w-full max-w-5xl' : 'w-full max-w-lg'}
                `}
            >
                {/* LEFT PANEL (MAIN FORM) */}
                <div className="flex-1 p-6 md:p-8 flex flex-col min-h-0 bg-white z-10 relative">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">
                                {isEditing ? (initialData ? 'Editar Lançamento' : 'Novo Lançamento') : 'Detalhes'}
                            </h2>
                            <p className="text-sm text-gray-400 font-medium">
                                {isEditing ? 'Preencha os dados principais' : 'Visualizar informações'}
                            </p>
                        </div>
                        {/* HEADER ACTIONS: EXPANSION TOGGLE (DESKTOP) & CLOSE */}
                        <div className="flex items-center gap-3">
                            {type !== 'TRANSFER' && isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className={`hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors px-3 py-2 rounded-lg
                                        ${isExpanded ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                                >
                                    {isExpanded ? (
                                        <>
                                            Menos Opções
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                        </>
                                    ) : (
                                        <>
                                            Mais Opções
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Mobile Toggle */}
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="md:hidden p-2 bg-gray-50 text-blue-600 rounded-lg"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpanded ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} /></svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {!isEditing ? (
                        /* VIEW MODE */
                        <div className="flex-1 flex flex-col space-y-6">
                            {/* Type Badge */}
                            <div className="flex">
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' :
                                    type === 'EXPENSE' ? 'bg-rose-100 text-rose-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                    {type === 'INCOME' ? 'Receita' : type === 'EXPENSE' ? 'Despesa' : 'Transferência'}
                                </span>
                            </div>

                            {/* Amount */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Valor</p>
                                <div className={`text-4xl font-bold ${type === 'INCOME' ? 'text-emerald-600' :
                                    type === 'EXPENSE' ? 'text-rose-600' :
                                        'text-blue-600'
                                    }`}>
                                    {currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : '€'} {parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${status === 'PAID' ? (type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600') : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {status === 'PAID' ? 'Efetivado' : 'Pendente'}
                                    </span>
                                    {status === 'PAID' && <span className="text-xs text-gray-400">em {new Date(paymentDate).toLocaleDateString('pt-BR')}</span>}
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Data Venc.</p>
                                    <p className="font-semibold text-gray-800">{new Date(date).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Conta</p>
                                    <p className="font-semibold text-gray-800">{accounts.find(a => a.id === accountId)?.name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Categoria</p>
                                    <p className="font-semibold text-gray-800">
                                        {categories.find(c => c.id === categoryId)?.name || (type === 'TRANSFER' ? 'Transferência' : '-')}
                                    </p>
                                </div>
                                {type === 'TRANSFER' && (
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Para Conta</p>
                                        <p className="font-semibold text-gray-800">{accounts.find(a => a.id === toAccountId)?.name || '-'}</p>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Descrição</p>
                                <p className="font-medium text-gray-800 text-lg">{description}</p>
                                {observation && <p className="mt-1 text-sm text-gray-500 italic">"{observation}"</p>}
                            </div>

                            {/* Tags */}
                            {tags.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Tags</p>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map(tag => (
                                            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-bold">#{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recurrence Info */}
                            {isRecurring && (
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Recorrência</p>
                                    <p className="text-sm font-medium text-blue-600 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        {recurringType === 'FIXED' ? 'Fixo Mensal' : `Parcelado (${recurrenceCount}x)`}
                                    </p>
                                </div>
                            )}

                            {/* Attachment Link (Micro-Preview Style) */}
                            {(initialData?.receiptUrl || receiptFile) && (
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Comprovante</p>
                                    <div
                                        onClick={() => setShowReceiptPreview(true)}
                                        className="flex items-center gap-3 p-2 bg-gray-50/50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors group"
                                    >
                                        {/* Preview Thumbnail */}
                                        <div className="w-10 h-10 shrink-0 bg-white rounded-lg overflow-hidden flex items-center justify-center border border-gray-100 relative">
                                            {(receiptFile && receiptFile.type.startsWith('image/')) || (initialData?.receiptUrl && !receiptFile && (initialData.receiptUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || !initialData.receiptUrl.toLowerCase().endsWith('.pdf'))) ? (
                                                <img
                                                    src={receiptFile ? URL.createObjectURL(receiptFile) : initialData?.receiptUrl}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                                />
                                            ) : (
                                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-700 truncate group-hover:text-blue-600 transition-colors">
                                                {receiptFile ? receiptFile.name : 'Visualizar Comprovante'}
                                            </p>
                                            <p className="text-xs text-gray-400 group-hover:text-blue-400 transition-colors">
                                                Clique para ampliar
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1"></div>

                            {/* ACTION BUTTONS (VIEW MODE) */}
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors uppercase tracking-wider text-xs">
                                    Fechar
                                </button>
                                <button onClick={() => { setIsEditing(true); setIsExpanded(true); }} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 uppercase tracking-wider text-xs flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    Editar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form id="transaction-form" onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col">

                            {/* TYPE TOGGLE */}
                            <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner w-full mb-2">
                                <button type="button" onClick={() => setType('INCOME')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Receita</button>
                                <button type="button" onClick={() => setType('EXPENSE')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Despesa</button>
                                <button type="button" onClick={() => setType('TRANSFER')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'TRANSFER' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Transf.</button>
                            </div>

                            {/* STATUS (REMOVED - INTEGRATED BELOW) */}

                            {/* MAIN FORM ROW */}
                            <div className="flex flex-col gap-4">

                                {/* TOP ROW: AMOUNT & STATUS */}
                                <div className="flex gap-4 items-center">
                                    {/* AMOUNT */}
                                    <div className="relative flex-1">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xl">
                                            {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'R$'}
                                        </span>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            placeholder="0,00"
                                            className={`w-full pl-12 pr-4 py-3 text-3xl font-bold bg-white border-2 rounded-2xl outline-none transition-all placeholder-gray-300
                                            ${type === 'INCOME' ? 'text-emerald-600 border-emerald-100 focus:border-emerald-500/50 focus:bg-emerald-50/10' :
                                                    type === 'EXPENSE' ? 'text-rose-600 border-rose-100 focus:border-rose-500/50 focus:bg-rose-50/10' :
                                                        'text-blue-600 border-blue-100 focus:border-blue-500/50 focus:bg-blue-50/10'}`}
                                        />
                                    </div>

                                    {/* STATUS TOGGLE (EFETIVADO/PENDENTE) */}
                                    {/* STATUS TOGGLE (EFETIVADO/PENDENTE) */}
                                    {type !== 'TRANSFER' && (
                                        <div className="flex flex-col items-center">
                                            <button
                                                type="button"
                                                onClick={() => setStatus(status === 'PAID' ? 'PENDING' : 'PAID')}
                                                className={`relative inline-flex h-12 w-[180px] items-center rounded-xl p-1 transition-colors focus:outline-none border-2 shadow-sm shrink-0
                                                ${status === 'PAID'
                                                        ? (type === 'INCOME' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100')
                                                        : 'bg-gray-50 border-gray-200'}`}
                                            >
                                                <span className="sr-only">Status</span>
                                                {/* Slider */}
                                                <span
                                                    className={`inline-block h-full w-[calc(50%-2px)] transform rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out border
                                                    ${status === 'PAID'
                                                            ? `translate-x-[100%] ${type === 'INCOME' ? 'border-emerald-200' : 'border-rose-200'}`
                                                            : 'translate-x-0 border-gray-200'}`}
                                                />
                                                {/* Labels Overlay */}
                                                <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
                                                    <span className={`w-1/2 text-center text-[10px] font-black uppercase tracking-wider transition-opacity duration-200 ${status === 'PENDING' ? 'text-gray-800 opacity-100' : 'text-gray-400 opacity-60'}`}>
                                                        Pendente
                                                    </span>
                                                    <span className={`w-1/2 text-center text-[10px] font-black uppercase tracking-wider transition-opacity duration-200 ${status === 'PAID' ? (type === 'INCOME' ? 'text-emerald-600 opacity-100' : 'text-rose-600 opacity-100') : 'text-gray-400 opacity-60'}`}>
                                                        Efetivado
                                                    </span>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* BOTTOM ROW: DATES */}
                                <div className="flex gap-4">
                                    {/* DUE DATE */}
                                    {/* DUE DATE */}
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Vencimento</label>
                                        <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50/50 border-none rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-colors text-gray-700" />
                                    </div>

                                    {/* PAYMENT DATE (CONDITIONAL) */}
                                    <div className={`flex-1 transition-all duration-300 ${status === 'PAID' ? 'opacity-100 translate-x-0' : 'opacity-50 pointer-events-none grayscale'}`}>
                                        <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1 ${type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>Pagamento</label>
                                        <input
                                            type="date"
                                            disabled={status !== 'PAID'}
                                            value={paymentDate}
                                            onChange={e => setPaymentDate(e.target.value)}
                                            className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-sm font-semibold outline-none transition-colors
                                            ${type === 'INCOME' ? 'border-emerald-100 text-emerald-800 focus:border-emerald-300' : 'border-rose-100 text-rose-800 focus:border-rose-300'}`}
                                        />
                                    </div>
                                </div>

                            </div>

                            {/* DESCRIPTION */}
                            {/* DESCRIPTION */}
                            <div>
                                <input required type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 bg-gray-50/50 border-none rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder-gray-300 text-lg" placeholder="Descrição (ex: Mercado, Salário)" />
                            </div>

                            {/* ACCOUNTS & CATEGORY GRID */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Conta</label>
                                    <select required value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50/50 border-none rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors">
                                        <option value="">Selecione...</option>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>

                                {type === 'TRANSFER' ? (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Para</label>
                                        <select required value={toAccountId} onChange={e => setToAccountId(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50/50 border-none rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors">
                                            <option value="">Selecione...</option>
                                            {accounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Categoria</label>

                                        {/* CUSTOM SELECT TRIGGER */}
                                        <div
                                            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                            className="w-full px-3 py-2.5 bg-gray-50/50 border-none rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer flex items-center justify-between hover:bg-gray-100"
                                        >
                                            <div className="flex items-center gap-2">
                                                {categoryId ? (
                                                    (() => {
                                                        const cat = categories.find(c => c.id === categoryId);
                                                        return (
                                                            <>
                                                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cat?.color || '#ccc' }} />
                                                                <span className="text-gray-900">{cat?.name}</span>
                                                            </>
                                                        );
                                                    })()
                                                ) : (
                                                    <span className="text-gray-400">Selecione...</span>
                                                )}
                                            </div>
                                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>

                                        {/* DROPDOWN PANEL */}
                                        {showCategoryDropdown && (
                                            <>
                                                {/* Backdrop to close */}
                                                <div className="fixed inset-0 z-40" onClick={() => setShowCategoryDropdown(false)}></div>

                                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 flex flex-col overflow-hidden animate-fadeIn">
                                                    {/* Search */}
                                                    <div className="p-2 border-b border-gray-50 bg-gray-50/50">
                                                        <input
                                                            type="text"
                                                            placeholder="Buscar categoria..."
                                                            value={categorySearch}
                                                            onChange={e => setCategorySearch(e.target.value)}
                                                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400"
                                                            autoFocus
                                                        />
                                                    </div>

                                                    {/* List */}
                                                    <div className="overflow-y-auto flex-1 p-1">
                                                        {(() => {
                                                            const filtered = categories.filter(c => c.type === type && c.name.toLowerCase().includes(categorySearch.toLowerCase()));
                                                            const parents = filtered.filter(c => !c.parentId);

                                                            // If search is active, show flat list or filtered hierarchy? 
                                                            // Simple flat list for search, Hierarchy for default.
                                                            if (categorySearch) {
                                                                return filtered.length > 0 ? filtered.map(cat => (
                                                                    <button
                                                                        key={cat.id}
                                                                        type="button"
                                                                        onClick={() => { setCategoryId(cat.id); setShowCategoryDropdown(false); }}
                                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                                                                    >
                                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                                                        <span className="text-gray-700">{cat.name}</span>
                                                                        {cat.parentId && <span className="text-xs text-gray-400 ml-auto">Subcategoria</span>}
                                                                    </button>
                                                                )) : <div className="p-3 text-center text-xs text-gray-400">Nenhuma categoria encontrada.</div>;
                                                            }

                                                            return parents.map(parent => {
                                                                const children = categories.filter(c => c.parentId === parent.id && c.type === type); // children might not be in 'filtered' if parent matched search but child didnt. Using base logic.

                                                                return (
                                                                    <div key={parent.id} className="mb-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => { setCategoryId(parent.id); setShowCategoryDropdown(false); }}
                                                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2 font-bold ${categoryId === parent.id ? 'bg-blue-50 text-blue-700' : 'text-gray-800'}`}
                                                                        >
                                                                            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: parent.color }} />
                                                                            {parent.name}
                                                                        </button>
                                                                        {children.map(child => (
                                                                            <button
                                                                                key={child.id}
                                                                                type="button"
                                                                                onClick={() => { setCategoryId(child.id); setShowCategoryDropdown(false); }}
                                                                                className={`w-full text-left pl-8 pr-3 py-1.5 text-sm hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2 ${categoryId === child.id ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500'}`}
                                                                            >
                                                                                <div className="w-1.5 h-1.5 rounded-full opacity-50" style={{ backgroundColor: child.color || parent.color }} />
                                                                                {child.name}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>



                            <div className="flex-1"></div>

                            {/* ACTION BUTTONS - BOTTOM LEFT */}
                            <div className="flex gap-3 pt-4 mt-2">
                                <button onClick={onClose} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors uppercase tracking-wider text-xs">
                                    Cancelar
                                </button>
                                <button form="transaction-form" type="submit" className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-xl shadow-gray-900/10 uppercase tracking-wider text-xs flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Salvar
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* RIGHT PANEL (EXPANDED OPTIONS) */}
                <div className={`bg-white border-l border-gray-50 transition-all duration-500 ease-in-out overflow-hidden flex flex-col
                    ${isExpanded && isEditing ? 'md:w-96 opacity-100' : 'md:w-0 opacity-0 pointer-events-none'}`}
                >
                    <div className="p-6 md:p-8 space-y-6 overflow-y-auto h-full min-w-[20rem]">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2">Opções Avançadas</h3>

                        {/* RECURRENCE (Conditional on Type) */}
                        {type !== 'TRANSFER' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-700">Repetir Lançamento?</label>
                                    <div
                                        onClick={() => setIsRecurring(!isRecurring)}
                                        className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${isRecurring ? 'bg-blue-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isRecurring ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </div>

                                {isRecurring && (
                                    <div className="bg-white p-3 rounded-xl border border-gray-200 animate-fadeIn space-y-3">
                                        <div className="flex bg-gray-50 p-1 rounded-lg">
                                            <button type="button" onClick={() => setRecurringType('FIXED')} className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all ${recurringType === 'FIXED' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Fixo (Mensal)</button>
                                            <button type="button" onClick={() => setRecurringType('INSTALLMENT')} className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all ${recurringType === 'INSTALLMENT' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Parcelado</button>
                                        </div>
                                        {recurringType === 'INSTALLMENT' ? (
                                            <div className="flex items-center gap-2">
                                                <input type="number" min="2" max="999" value={recurrenceCount} onChange={e => setRecurrenceCount(Number(e.target.value))} className="w-16 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-center outline-none focus:border-blue-500" />
                                                <span className="text-xs text-gray-500 font-medium">parcelas de R$ {(Number(amount || 0) / recurrenceCount).toFixed(2)}</span>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-blue-500 bg-blue-50 p-2 rounded-lg">Lançamento por tempo <strong>indeterminado</strong>. O sistema gerará as recorrências automaticamente.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <hr className="border-gray-200" />

                        {/* OBS */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Observações</label>
                            <textarea
                                value={observation}
                                onChange={e => setObservation(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                                placeholder="Detalhes adicionais..."
                            />
                        </div>

                        {/* TAGS (Autocomplete & Chips) */}
                        <div className="relative group z-20">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Tags</label>
                            <div className="min-h-[42px] w-full px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300 transition-all flex flex-wrap items-center gap-2">
                                {tags.map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg flex items-center gap-1 font-bold animate-fadeIn">
                                        #{tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500 ml-1 rounded-full p-0.5">×</button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ',') {
                                            e.preventDefault();
                                            handleAddTag();
                                        } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                                            removeTag(tags[tags.length - 1]);
                                        }
                                    }}
                                    placeholder={tags.length === 0 ? "Adicionar tag..." : ""}
                                    className="flex-1 bg-transparent outline-none min-w-[100px] placeholder-gray-400 h-8"
                                />
                            </div>

                            {/* Autocomplete Suggestions */}
                            {tagInput.trim().length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-30 max-h-40 overflow-y-auto w-full">
                                    {availableTags
                                        .filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t))
                                        .map(suggestion => (
                                            <button
                                                key={suggestion}
                                                type="button"
                                                onClick={() => {
                                                    setTags([...tags, suggestion]);
                                                    setTagInput('');
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 font-medium transition-colors flex items-center gap-2"
                                            >
                                                <span className="text-gray-400">#</span> {suggestion}
                                            </button>
                                        ))}
                                    {/* Create new option */}
                                    {!availableTags.some(t => t.toLowerCase() === tagInput.trim().toLowerCase()) && !tags.includes(tagInput.trim()) && (
                                        <button
                                            type="button"
                                            onClick={handleAddTag}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 text-blue-600 font-bold transition-colors border-t border-gray-50"
                                        >
                                            Criar "{tagInput}"
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ATTACHMENT (Micro-Preview) */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Comprovante</label>

                            {receiptFile || initialData?.receiptUrl ? (
                                <div className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-xl shadow-sm">
                                    {/* Preview */}
                                    <div className="w-10 h-10 shrink-0 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-100 relative group">
                                        {(receiptFile && receiptFile.type.startsWith('image/')) || (initialData?.receiptUrl && !receiptFile && (initialData.receiptUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || !initialData.receiptUrl.toLowerCase().endsWith('.pdf'))) ? (
                                            <img
                                                src={receiptFile ? URL.createObjectURL(receiptFile) : initialData?.receiptUrl}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                                onLoad={(e) => { if (receiptFile) URL.revokeObjectURL((e.target as HTMLImageElement).src) }}
                                            />
                                        ) : (
                                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-700 truncate">
                                            {receiptFile ? receiptFile.name : 'Comprovante Salvo'}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {receiptFile ? `${(receiptFile.size / 1024).toFixed(0)}KB` : 'Anexo disponível'}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 pr-1">
                                        {/* Remove */}
                                        <button
                                            type="button"
                                            onClick={() => { setReceiptFile(null); if (initialData) initialData.receiptUrl = undefined; }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remover"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="cursor-pointer flex items-center justify-center gap-2 p-3 bg-white border border-dashed border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all group">
                                    <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg group-hover:bg-blue-100 transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    </div>
                                    <span className="text-xs font-bold text-gray-600 group-hover:text-gray-800">Clique para anexar arquivo ou imagem</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={e => {
                                            if (e.target.files?.[0]) {
                                                setReceiptFile(e.target.files[0]);
                                            }
                                        }}
                                        accept="image/*,.pdf"
                                    />
                                </label>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* FULL SCREEN PREVIEW MODAL */}
            {
                showReceiptPreview && (
                    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex flex-col animate-fade-in">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between p-4 text-white bg-black/50">
                            <h3 className="font-bold text-lg">Visualização do Comprovante</h3>
                            <div className="flex items-center gap-4">
                                <a
                                    href={receiptFile ? URL.createObjectURL(receiptFile) : initialData?.receiptUrl}
                                    download
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white"
                                    title="Baixar Original"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" /></svg>
                                </a>
                                <button
                                    onClick={() => setShowReceiptPreview(false)}
                                    className="p-2 hover:bg-white/20 rounded-full transition-colors text-gray-300 hover:text-white"
                                >
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden" onClick={() => setShowReceiptPreview(false)}>
                            <div className="relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                                {(receiptFile && receiptFile.type.startsWith('image/')) || (initialData?.receiptUrl && !receiptFile && (initialData.receiptUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || !initialData.receiptUrl.toLowerCase().endsWith('.pdf'))) ? (
                                    <img
                                        src={receiptFile ? URL.createObjectURL(receiptFile) : initialData?.receiptUrl}
                                        alt="Full Size"
                                        className="max-w-full max-h-[85vh] object-contain"
                                    />
                                ) : (
                                    <iframe
                                        src={receiptFile ? URL.createObjectURL(receiptFile) : initialData?.receiptUrl}
                                        className="w-[80vw] h-[80vh] bg-white rounded-lg"
                                        title="Document Preview"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
