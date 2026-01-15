import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Transaction,
  Account,
  Category,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from "../types";
import { MonthSelector } from "./ui/MonthSelector";
import { Button } from "./ui/Button";

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onDelete: (id: string, force?: boolean) => void;
  onEdit: (transaction: Transaction) => void;
  onToggleStatus: (id: string) => void;
  onSettleTransaction: (
    id: string,
    amount: number,
    date: string,
    description: string,
    accountId: string,
    paymentMethodId?: string,
    tags?: string[],
    observation?: string,
    file?: File
  ) => void;
  paymentMethods: PaymentMethod[];
  availableTags: string[];
  initialDateRange?: { start: string; end: string };
  initialHighlightedId?: string;
}


const TransactionRow: React.FC<{
  tx: Transaction;
  isChild?: boolean;
  index?: number;
  accounts: Account[];
  categories: Category[];
  categoryCodeMap: Map<string, string>;
  childrenMap: Map<string, Transaction[]>;
  expandedParents: Set<string>;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (t: Transaction) => void;
  onSettle: (t: Transaction, balance: number) => void;
  highlightedId?: string;
}> = ({
  tx,
  isChild = false,
  index = 0,
  accounts,
  categories,
  categoryCodeMap,
  childrenMap,
  expandedParents,
  onToggleExpand,
  onDelete,
  onEdit,
  onSettle,
  highlightedId,
}) => {
  const account = accounts.find((a) => a.id === tx.accountId);
  const category = categories.find((c) => c.id === tx.categoryId);
  const catCode = category ? categoryCodeMap.get(category.id) : "";

  const dateObj = new Date(
    (isChild && tx.paymentDate ? tx.paymentDate : tx.date) + "T00:00:00"
  );
  const formattedDate = dateObj.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  const children = !isChild ? childrenMap.get(tx.id) || [] : [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedParents.has(tx.id);

  const totalRealized = children.reduce(
    (sum, c) => sum + (c.status === "PAID" ? c.amount : 0),
    0
  );
  const isFullyPaid = tx.status === "PAID";
  const effectiveRealized = isFullyPaid ? tx.amount : totalRealized;
  const balance = Math.max(0, tx.amount - effectiveRealized);

  const isOverdue =
    !isFullyPaid &&
    tx.date < new Date().toISOString().split("T")[0] &&
    !isChild;
  const isPartial = !isFullyPaid && totalRealized > 0 && !isChild;

  const formatBRL = (val: number) =>
    `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const typeColor =
    tx.type === "INCOME"
      ? "text-emerald-600"
      : tx.type === "EXPENSE"
      ? "text-rose-600"
      : "text-blue-600";
  const typeLabel =
    tx.type === "INCOME"
      ? "Receita"
      : tx.type === "EXPENSE"
      ? "Despesa"
      : "Transf.";

  return (
    <React.Fragment>
      <tr
        id={`tx-${tx.id}`}
        className={`group transition-colors border-b border-gray-100 cursor-pointer ${
            tx.id === highlightedId ? "bg-yellow-50 border-l-4 border-yellow-400" :
          isChild
            ? "bg-blue-50/30"
            : isExpanded
            ? "bg-blue-50/80 shadow-sm"
            : "bg-white hover:bg-gray-50/50"
        }`}
        onClick={() => onEdit(tx)}
      >
        {/* DATA */}
        <td
          className={`px-4 py-2 whitespace-nowrap align-middle text-center w-20 ${
            isChild
              ? "border-l-4 border-blue-300"
              : isExpanded
              ? "border-l-[6px] border-blue-800"
              : ""
          }`}
        >
          <span
            className={`text-sm ${isChild ? "text-gray-400" : "text-gray-700"}`}
          >
            {formattedDate}
          </span>
        </td>

        {/* TIPO */}
        <td className="px-4 py-2 align-middle whitespace-nowrap text-center">
          <span
            className={`text-[10px] font-semibold uppercase ${typeColor} inline-flex items-center justify-center w-8 h-8 rounded-full bg-opacity-10 ${
              tx.type === "INCOME"
                ? "bg-emerald-100"
                : tx.type === "EXPENSE"
                ? "bg-rose-100"
                : "bg-blue-100"
            }`}
            title={typeLabel}
          >
            {tx.type === "INCOME" ? (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            ) : tx.type === "EXPENSE" ? (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            )}
          </span>
        </td>

        {/* CATEGORIA */}
        <td className="px-4 py-2 align-middle whitespace-nowrap">
          {!isChild && category ? (
            <span className="text-xs text-gray-600">{category.name}</span>
          ) : isChild ? (
            <span className="text-xs text-blue-600 italic pl-4 font-bold">
              ↳ {tx.type === "INCOME" ? "Recebimento" : "Pagamento"} parcial
            </span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        {/* DESCRIÇÃO */}
        <td className="px-4 py-2 align-middle">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm ${
                isChild ? "text-gray-600 italic font-medium" : "text-gray-700"
              } truncate max-w-[220px]`}
            >
              {tx.description}
              {tx.isRecurring && (
                <span className="ml-1 text-[10px] text-gray-400 font-medium">
                  {tx.recurringType === "FIXED"
                    ? "(Fixo)"
                    : `(${tx.installmentCurrent}/${tx.installmentTotal})`}
                </span>
              )}
            </span>
            {!isChild && hasChildren && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(tx.id);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all active:scale-95 shadow-sm border ${
                  isExpanded
                    ? "bg-blue-600 text-white border-blue-600 shadow-blue-200"
                    : "bg-white text-blue-600 border-blue-100 hover:bg-blue-50"
                }`}
              >
                <span>{children.length}</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            )}
          </div>
        </td>

        {/* CONTA */}
        <td className="px-4 py-2 align-middle whitespace-nowrap">
          <span className="text-xs text-gray-500 uppercase">
            {account?.name || "-"}
          </span>
        </td>

        {/* VALORES */}
        <td className="px-4 py-2 text-right align-middle whitespace-nowrap">
          {!isChild ? (
            <span className={`text-sm font-semibold ${typeColor}`}>
              {formatBRL(tx.amount)}
            </span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>
        <td className="px-4 py-2 text-right align-middle whitespace-nowrap">
          <span className="text-sm text-gray-600">
            {isChild ? formatBRL(tx.amount) : formatBRL(effectiveRealized)}
          </span>
        </td>
        <td className="px-4 py-2 text-right align-middle whitespace-nowrap">
          {!isChild ? (
            <span
              className={`text-sm ${
                isPartial ? "text-amber-600" : "text-gray-700"
              }`}
            >
              {formatBRL(balance)}
            </span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        {/* STATUS */}
        <td className="px-4 py-2 align-middle text-center whitespace-nowrap">
          <div className="flex justify-center">
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-full transition-all ${
                isFullyPaid
                  ? "bg-emerald-100 text-emerald-600"
                  : isPartial
                  ? "bg-amber-100 text-amber-600"
                  : isOverdue
                  ? "bg-rose-100 text-rose-600"
                  : "bg-gray-100 text-gray-400"
              }`}
              title={
                isFullyPaid
                  ? "Liquidado"
                  : isPartial
                  ? "Parcialmente Pago"
                  : isOverdue
                  ? "Atrasado"
                  : "Pendente"
              }
            >
              {isFullyPaid ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : isPartial ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M20 12h-8V4a8 8 0 10 0 16 8 8 0 000-16z"
                  />
                </svg>
              ) : isOverdue ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </span>
          </div>
        </td>

        {/* AÇÕES */}
        <td className="px-4 py-2 text-right align-middle whitespace-nowrap">
          <div className="inline-flex items-center gap-1">
            {!isChild && !isFullyPaid && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSettle(tx, balance);
                }}
                className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Efetivar"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(tx);
              }}
              className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
              title="Editar"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(tx.id);
              }}
              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
              title="Excluir"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
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
      {isExpanded &&
        children.map((child, idx) => (
          <TransactionRow
            key={child.id}
            tx={child}
            isChild={true}
            index={idx}
            accounts={accounts}
            categories={categories}
            categoryCodeMap={categoryCodeMap}
            childrenMap={childrenMap}
            expandedParents={expandedParents}
            onToggleExpand={onToggleExpand}
            onDelete={onDelete}
            onEdit={onEdit}
            onSettle={onSettle}
          />
        ))}
    </React.Fragment>
  );
};

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  accounts,
  categories,
  onDelete,
  onEdit,
  onSettleTransaction,
  paymentMethods,
  availableTags,
  initialDateRange,
  initialHighlightedId
}) => {
  // Inicializar datas com o primeiro e último dia do mês atual
  const [startDate, setStartDate] = useState(() => {
    if (initialDateRange) return initialDateRange.start;
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    if (initialDateRange) return initialDateRange.end;
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
  });

  // Update effect in case props change while mounted or re-mounted
  useEffect(() => {
    if (initialDateRange) {
        setStartDate(initialDateRange.start);
        setEndDate(initialDateRange.end);
    }
  }, [initialDateRange]);

  // Scroll effect
  useEffect(() => {
      if (initialHighlightedId) {
          // Reset filters to ensure visibility? User might have filters on. 
          // For now assume user clears filters or navigation sets date correct.
          setTimeout(() => {
              const el = document.getElementById(`tx-${initialHighlightedId}`);
              if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
          }, 800); // 800ms to allow rendering
      }
  }, [initialHighlightedId, startDate]); // startDate change triggers re-render, then scroll

  const [filterType, setFilterType] = useState<
    "ALL" | "INCOME" | "EXPENSE" | "TRANSFER"
  >("ALL");
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "PAID" | "PENDING" | "PARTIAL"
  >("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [categorySearch, setCategorySearch] = useState("");
  const [ignoreDate, setIgnoreDate] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [isOpenType, setIsOpenType] = useState(false);
  const [isOpenStatus, setIsOpenStatus] = useState(false);
  const [isOpenCategory, setIsOpenCategory] = useState(false);

  // Efeito para fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(event.target as Node)) {
        setIsOpenType(false);
      }
      if (
        statusRef.current &&
        !statusRef.current.contains(event.target as Node)
      ) {
        setIsOpenStatus(false);
      }
      if (
        categoryRef.current &&
        !categoryRef.current.contains(event.target as Node)
      ) {
        setIsOpenCategory(false);
        setCategorySearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMonthChange = (newDate: Date) => {
    const start = new Date(newDate.getFullYear(), newDate.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const end = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
    setStartDate(start);
    setEndDate(end);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedParents, setExpandedParents] = useState<Set<string>>(
    new Set()
  );
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [transactionToSettle, setTransactionToSettle] =
    useState<Transaction | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const typeRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  const [settleAmount, setSettleAmount] = useState("");
  const [settleDate, setSettleDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [settleDescription, setSettleDescription] = useState("");
  const [settleAccountId, setSettleAccountId] = useState("");
  const [settlePaymentMethodId, setSettlePaymentMethodId] = useState("");
  const [settleTags, setSettleTags] = useState<string[]>([]);
  const [settleTagInput, setSettleTagInput] = useState("");
  const [settleObservation, setSettleObservation] = useState("");
  const [settleFile, setSettleFile] = useState<File | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // ... (rest of simple states)

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedParents);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedParents(newSet);
  };

  const categoryCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    const buildCodes = (parentId: string | undefined, prefix: string) => {
      categories
        .filter((c) => c.parentId === parentId)
        .forEach((c, i) => {
          const code = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
          map.set(c.id, code);
          buildCodes(c.id, code);
        });
    };
    buildCodes(undefined, "");
    return map;
  }, [categories]);

  // Filtragem principal
  const { roots, childrenMap, summary } = useMemo(() => {
    const allRoots = transactions.filter((t) => !t.parentId);
    const allChildren = transactions.filter((t) => t.parentId);
    const childrenMap = new Map<string, Transaction[]>();

    allChildren.forEach((c) => {
      const list = childrenMap.get(c.parentId!) || [];
      list.push(c);
      childrenMap.set(c.parentId!, list);
    });

    const filteredRoots = allRoots.filter((t) => {
      // Filtro de Data
      if (!ignoreDate && (t.date < startDate || t.date > endDate)) return false;

      // Filtro de Tipo (Dropdown)
      if (filterType !== "ALL" && t.type !== filterType) return false;

      // Filtro de Status
      if (filterStatus !== "ALL") {
        const children = childrenMap.get(t.id) || [];
        const totalRealized = children.reduce(
          (sum, c) => sum + (c.status === "PAID" ? c.amount : 0),
          0
        );
        const isPartial = t.status !== "PAID" && totalRealized > 0;

        if (filterStatus === "PAID" && t.status !== "PAID") return false;
        if (filterStatus === "PENDING" && (t.status === "PAID" || isPartial))
          return false;
        if (filterStatus === "PARTIAL" && !isPartial) return false;
      }

      // Filtro de Categoria
      if (filterCategory !== "ALL" && t.categoryId !== filterCategory)
        return false;

      // Busca Texto
      if (
        searchQuery &&
        !t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;

      return true;
    });

    const summary = filteredRoots.reduce(
      (acc, t) => {
        const children = childrenMap.get(t.id) || [];
        const realized = children.reduce(
          (sum, c) => sum + (c.status === "PAID" ? c.amount : 0),
          0
        );
        const actualRealized = t.status === "PAID" ? t.amount : realized;
        const remaining = Math.max(0, t.amount - actualRealized);
        if (t.type === "INCOME") {
          acc.incomeRealized += actualRealized;
          acc.incomePending += remaining;
        } else {
          acc.expenseRealized += actualRealized;
          acc.expensePending += remaining;
        }
        return acc;
      },
      {
        incomeRealized: 0,
        incomePending: 0,
        expenseRealized: 0,
        expensePending: 0,
      }
    );

    return {
      roots: filteredRoots.sort((a, b) => b.date.localeCompare(a.date)),
      childrenMap,
      summary,
    };
  }, [
    transactions,
    startDate,
    endDate,
    filterType,
    filterStatus,
    filterCategory,
    ignoreDate,
    searchQuery,
  ]);

  return (
    <div className="h-full flex flex-col bg-gray-50/30">
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 bg-white">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Lançamentos</h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            Gerencie suas movimentações financeiras
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showFilters
                ? "bg-blue-50 text-blue-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1-.293.707l-6.414 6.414a1 1-.293.707V17l-4 4v-6.586a1 1-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filtros
          </button>
          <button
            onClick={() =>
              document.dispatchEvent(new CustomEvent("open-new-transaction"))
            }
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Novo Lançamento
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Receitas Realizadas",
              val: summary.incomeRealized,
              icon: "M12 4v16m8-8H4",
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: "Receitas Pendentes",
              val: summary.incomePending,
              icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
              color: "text-emerald-400",
              bg: "bg-emerald-50/50",
            },
            {
              label: "Despesas Realizadas",
              val: summary.expenseRealized,
              icon: "M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6",
              color: "text-rose-600",
              bg: "bg-rose-50",
            },
            {
              label: "Despesas Pendentes",
              val: summary.expensePending,
              icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
              color: "text-rose-400",
              bg: "bg-rose-50/50",
            },
            {
              label: "Saldo Realizado",
              val: summary.incomeRealized - summary.expenseRealized,
              icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Saldo Projetado",
              val:
                summary.incomeRealized +
                summary.incomePending -
                (summary.expenseRealized + summary.expensePending),
              icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
              color: "text-indigo-600",
              bg: "bg-indigo-50",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`p-1.5 rounded-lg ${item.bg} ${item.color}`}>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={item.icon}
                    />
                  </svg>
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {item.label}
                </p>
                <h3 className={`text-sm font-bold ${item.color} truncate`}>
                  R${" "}
                  {item.val.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </h3>
              </div>
            </div>
          ))}
        </div>

        {/* TABELA COM SCROLL */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100/50 overflow-hidden flex flex-col">
          {/* ÁREA DE FILTROS EXPANSÍVEL */}
          <div
            className={`shrink-0 transition-all duration-300 ease-in-out border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-white ${
              showFilters
                ? "max-h-40 opacity-100 py-4 px-6"
                : "max-h-0 opacity-0 overflow-hidden py-0 px-6 border-none"
            }`}
          >
            <div className="flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center">
              <div className="flex items-center gap-3 flex-wrap flex-1">
                {/* Controle Temporal Unificado */}
                {!ignoreDate && (
                  <div className="flex items-center bg-white p-1 rounded-xl border border-gray-200 shadow-sm h-[42px] transition-all">
                    {/* Botão Voltar/Mês Anterior */}
                    <button
                      onClick={() => {
                        if (showCustomRange) {
                          setShowCustomRange(false);
                          handleMonthChange(new Date(startDate + "T00:00:00"));
                        } else {
                          const current = new Date(startDate + "T00:00:00");
                          handleMonthChange(
                            new Date(current.setMonth(current.getMonth() - 1))
                          );
                        }
                      }}
                      className="p-2 hover:bg-gray-50 text-gray-400 hover:text-blue-600 rounded-lg transition-all"
                      title={
                        showCustomRange
                          ? "Voltar para seleção mensal"
                          : "Mês Anterior"
                      }
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>

                    {showCustomRange ? (
                      <div className="flex items-center gap-2 px-3 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">
                            De
                          </span>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent border-none p-0 text-[11px] font-bold text-gray-700 outline-none focus:ring-0 w-[95px]"
                          />
                        </div>
                        <div className="w-px h-4 bg-gray-200 mx-1" />
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">
                            Até
                          </span>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent border-none p-0 text-[11px] font-bold text-gray-700 outline-none focus:ring-0 w-[95px]"
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowCustomRange(true)}
                        className="flex-1 px-6 text-center min-w-[160px] hover:bg-blue-50/50 rounded-lg transition-all py-1.5 group"
                        title="Clique para definir intervalo personalizado"
                      >
                        <span className="text-sm font-bold text-gray-700 capitalize group-hover:text-blue-600 transition-colors">
                          {new Date(startDate + "T00:00:00").toLocaleDateString(
                            "pt-BR",
                            { month: "long", year: "numeric" }
                          )}
                        </span>
                      </button>
                    )}

                    {/* Botão Avançar/Próximo Mês */}
                    <button
                      onClick={() => {
                        if (showCustomRange) {
                          setShowCustomRange(false);
                          handleMonthChange(new Date(startDate + "T00:00:00"));
                        } else {
                          const current = new Date(startDate + "T00:00:00");
                          handleMonthChange(
                            new Date(current.setMonth(current.getMonth() + 1))
                          );
                        }
                      }}
                      className="p-2 hover:bg-gray-50 text-gray-400 hover:text-blue-600 rounded-lg transition-all"
                      title={
                        showCustomRange
                          ? "Voltar para seleção mensal"
                          : "Próximo Mês"
                      }
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="h-8 w-px bg-gray-200 mx-1 hidden lg:block"></div>

                {/* Grupo de Filtros */}
                <div className="flex items-center gap-2">
                  {/* Dropdown de Tipo Customizado */}
                  <div className="relative" ref={typeRef}>
                    <button
                      onClick={() => {
                        setIsOpenType(!isOpenType);
                        setIsOpenStatus(false);
                        setIsOpenCategory(false);
                      }}
                      className="h-[42px] flex items-center justify-between gap-3 px-4 bg-white border border-gray-200 text-gray-700 text-[10px] font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm min-w-[155px] outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex items-center justify-center w-5 h-5 rounded-lg ${
                            filterType === "INCOME"
                              ? "bg-emerald-100 text-emerald-600"
                              : filterType === "EXPENSE"
                              ? "bg-rose-100 text-rose-600"
                              : filterType === "TRANSFER"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {filterType === "INCOME" ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                          ) : filterType === "EXPENSE" ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                            </svg>
                          ) : filterType === "TRANSFER" ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          )}
                        </span>
                        <span className="uppercase tracking-wide">
                          {filterType === "ALL" ? "Todos os Tipos" : filterType === "INCOME" ? "Receitas" : filterType === "EXPENSE" ? "Despesas" : "Transf."}
                        </span>
                      </div>
                      <svg className={`w-3 h-3 text-gray-400 transition-transform ${isOpenType ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isOpenType && (
                      <div className="absolute top-full mt-2 left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl p-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-200 min-w-[180px]">
                        {[
                          { id: "ALL", label: "Todos os Tipos", icon: "M4 6h16M4 12h16M4 18h16" },
                          { id: "INCOME", label: "Receitas", icon: "M12 4v16m8-8H4", color: "emerald" },
                          { id: "EXPENSE", label: "Despesas", icon: "M20 12H4", color: "rose" },
                          { id: "TRANSFER", label: "Transferências", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4", color: "blue" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setFilterType(opt.id as any);
                              setIsOpenType(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all uppercase tracking-wide text-left ${
                              filterType === opt.id ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <span
                              className={`flex items-center justify-center w-5 h-5 rounded-lg ${
                                opt.id === "INCOME"
                                  ? "bg-emerald-100 text-emerald-600"
                                  : opt.id === "EXPENSE"
                                  ? "bg-rose-100 text-rose-600"
                                  : opt.id === "TRANSFER"
                                  ? "bg-blue-100 text-blue-600"
                                  : "bg-gray-100 text-gray-400"
                              }`}
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={opt.icon} />
                              </svg>
                            </span>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dropdown de Categoria Customizado */}
                  <div className="relative" ref={categoryRef}>
                    <button
                      onClick={() => {
                        setIsOpenCategory(!isOpenCategory);
                        setIsOpenType(false);
                        setIsOpenStatus(false);
                      }}
                      className="h-[42px] flex items-center justify-between gap-3 px-4 bg-white border border-gray-200 text-gray-700 text-[10px] font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm min-w-[165px] outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center justify-center w-5 h-5 rounded-lg ${filterCategory === "ALL" ? "bg-gray-100 text-gray-400" : "bg-indigo-100 text-indigo-600"}`}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </span>
                        <span className="uppercase tracking-wide truncate max-w-[100px]">
                          {filterCategory === "ALL" ? "Categorias" : categories.find(c => c.id === filterCategory)?.name || "Categoria"}
                        </span>
                      </div>
                      <svg className={`w-3 h-3 text-gray-400 transition-transform ${isOpenCategory ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isOpenCategory && (
                      <div className="absolute top-full mt-2 left-0 w-full min-w-[240px] bg-white border border-gray-100 rounded-2xl shadow-2xl p-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Campo de Busca Interno */}
                        <div className="px-2 pb-2 mb-2 border-b border-gray-50">
                          <div className="relative">
                            <input
                              autoFocus
                              type="text"
                              value={categorySearch}
                              onChange={(e) => setCategorySearch(e.target.value)}
                              placeholder="Buscar categoria..."
                              className="w-full h-9 pl-8 pr-3 text-[10px] font-bold bg-gray-50 border-none rounded-lg focus:ring-1 focus:ring-blue-400 outline-none"
                            />
                            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-0.5">
                          <button
                            onClick={() => {
                              setFilterCategory("ALL");
                              setIsOpenCategory(false);
                              setCategorySearch("");
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all uppercase tracking-wide text-left ${
                              filterCategory === "ALL" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-gray-100 text-gray-400">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                            </span>
                            Todas as Categorias
                          </button>
                          
                          {categories
                            .filter(cat => {
                              const searchLower = categorySearch.toLowerCase();
                              const code = categoryCodeMap.get(cat.id) || "";
                              return cat.name.toLowerCase().includes(searchLower) || code.includes(searchLower);
                            })
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((cat) => {
                              const code = categoryCodeMap.get(cat.id);
                              return (
                                <button
                                  key={cat.id}
                                  onClick={() => {
                                    setFilterCategory(cat.id);
                                    setIsOpenCategory(false);
                                    setCategorySearch("");
                                  }}
                                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all uppercase tracking-wide text-left ${
                                    filterCategory === cat.id ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className={`flex items-center justify-center w-5 h-5 rounded-lg ${
                                      cat.type === "INCOME" ? "bg-emerald-100 text-emerald-600" : 
                                      cat.type === "EXPENSE" ? "bg-rose-100 text-rose-600" : 
                                      "bg-blue-100 text-blue-600"
                                    }`}>
                                      {cat.type === "INCOME" ? (
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                        </svg>
                                      ) : cat.type === "EXPENSE" ? (
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                                        </svg>
                                      ) : (
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                      )}
                                    </span>
                                    <span>{cat.name}</span>
                                  </div>
                                  <span className="text-[9px] opacity-40 font-mono tracking-tighter">
                                    {code}
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dropdown de Status Customizado */}
                  <div className="relative" ref={statusRef}>
                    <button
                      onClick={() => {
                        setIsOpenStatus(!isOpenStatus);
                        setIsOpenType(false);
                        setIsOpenCategory(false);
                      }}
                      className="h-[42px] flex items-center justify-between gap-3 px-4 bg-white border border-gray-200 text-gray-700 text-[10px] font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm min-w-[155px] outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex items-center justify-center w-5 h-5 rounded-lg ${
                            filterStatus === "PAID"
                              ? "bg-emerald-100 text-emerald-600"
                              : filterStatus === "PARTIAL"
                              ? "bg-amber-100 text-amber-600"
                              : filterStatus === "PENDING"
                              ? "bg-gray-100 text-gray-400"
                              : "bg-blue-50 text-blue-500"
                          }`}
                        >
                          {filterStatus === "PAID" ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : filterStatus === "PARTIAL" ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12h-8V4a8 8 0 10 0 16 8 8 0 000-16z" />
                            </svg>
                          ) : filterStatus === "PENDING" ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          )}
                        </span>
                        <span className="uppercase tracking-wide">
                          {filterStatus === "ALL" ? "Status" : filterStatus === "PAID" ? "Liquidados" : filterStatus === "PARTIAL" ? "Parciais" : "Pendentes"}
                        </span>
                      </div>
                      <svg className={`w-3 h-3 text-gray-400 transition-transform ${isOpenStatus ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isOpenStatus && (
                      <div className="absolute top-full mt-2 left-0 w-full min-w-[170px] bg-white border border-gray-100 rounded-2xl shadow-2xl p-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                        {[
                          { id: "ALL", label: "Todos os Status", color: "blue" },
                          { id: "PAID", label: "Liquidados", icon: "M5 13l4 4L19 7" },
                          { id: "PARTIAL", label: "Parciais", icon: "M20 12h-8V4a8 8 0 10 0 16 8 8 0 000-16z" },
                          { id: "PENDING", label: "Pendentes", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setFilterStatus(opt.id as any);
                              setIsOpenStatus(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all uppercase tracking-wide text-left ${
                              filterStatus === opt.id ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <span
                              className={`flex items-center justify-center w-5 h-5 rounded-lg ${
                                opt.id === "PAID"
                                  ? "bg-emerald-100 text-emerald-600"
                                  : opt.id === "PARTIAL"
                                  ? "bg-amber-100 text-amber-600"
                                  : opt.id === "PENDING"
                                  ? "bg-gray-100 text-gray-400"
                                  : "bg-blue-50 text-blue-500"
                              }`}
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d={opt.icon || "M4 6h16M4 12h16M4 18h16"}
                                />
                              </svg>
                            </span>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setIgnoreDate(!ignoreDate)}
                    className={`h-[42px] flex items-center gap-2 px-4 rounded-xl text-[10px] font-bold transition-all border shadow-sm uppercase tracking-wide whitespace-nowrap ${
                      ignoreDate
                        ? "bg-blue-600 text-white border-blue-600 shadow-blue-200"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {ignoreDate ? "Ver Período" : "Ver Tudo"}
                  </button>
                </div>
              </div>

              {/* Busca */}
              <div className="relative w-full lg:w-72 group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Buscar por descrição..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-[42px] pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-xs w-full focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 outline-none transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* TABELA COM SCROLL */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 sticky top-0 z-10">
                <tr className="border-b border-gray-100 bg-gray-50 backdrop-blur-sm">
                  <th className="px-4 py-2 text-center w-20">Vencimento</th>
                  <th className="px-4 py-2 text-center">Tipo</th>
                  <th className="px-4 py-2 text-left">Categoria</th>
                  <th className="px-4 py-2 text-left">Descrição</th>
                  <th className="px-4 py-2 text-left">Conta</th>
                  <th className="px-4 py-2 text-right">Previsto</th>
                  <th className="px-4 py-2 text-right">Realizado</th>
                  <th className="px-4 py-2 text-right">Saldo</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {roots.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="text-center py-32 text-gray-400 font-medium italic"
                    >
                      Nenhum lançamento no período.
                    </td>
                  </tr>
                ) : (
                  roots.map((r) => (
                    <TransactionRow
                      key={r.id}
                      tx={r}
                      accounts={accounts}
                      categories={categories}
                      categoryCodeMap={categoryCodeMap}
                      childrenMap={childrenMap}
                      expandedParents={expandedParents}
                      onToggleExpand={toggleExpand}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onSettle={(t, b) => {
                        setTransactionToSettle(t);
                        setSettleAmount(b.toFixed(2));
                        setSettleDescription(`Baixa: ${t.description}`);
                        setSettleDate(new Date().toISOString().split("T")[0]);
                        setSettleAccountId(t.accountId);
                        setSettlePaymentMethodId(t.paymentMethodId || "");
                        setSettleTags(t.tags || []);
                        setSettleObservation(t.observation || "");
                        setSettleFile(null);
                        setSettleModalOpen(true);
                      }}
                      highlightedId={initialHighlightedId}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {settleModalOpen && transactionToSettle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl animate-scale-in my-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    Confirmar Efetivação
                  </h3>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mt-1">
                    Registro de movimento de caixa
                  </p>
                </div>
                <button
                  onClick={() => setSettleModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSettleTransaction(
                    transactionToSettle.id,
                    parseFloat(settleAmount),
                    settleDate,
                    settleDescription,
                    settleAccountId,
                    settlePaymentMethodId || undefined,
                    settleTags,
                    settleObservation,
                    settleFile || undefined
                  );
                  setSettleModalOpen(false);
                  setExpandedParents(
                    new Set([...expandedParents, transactionToSettle.id])
                  );
                }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Descrição da Baixa
                      </label>
                      <input
                        type="text"
                        required
                        value={settleDescription}
                        onChange={(e) => setSettleDescription(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-semibold text-gray-700 shadow-inner"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                          Data
                        </label>
                        <input
                          type="date"
                          required
                          value={settleDate}
                          onChange={(e) => setSettleDate(e.target.value)}
                          className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-xs font-bold shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                          Valor
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                            R$
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={settleAmount}
                            onChange={(e) => setSettleAmount(e.target.value)}
                            className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-gray-700 shadow-inner"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Conta de Destino
                      </label>
                      <select
                        required
                        value={settleAccountId}
                        onChange={(e) => setSettleAccountId(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-semibold text-gray-700 shadow-inner appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                        }}
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Forma de Pagamento
                      </label>
                      <select
                        value={settlePaymentMethodId}
                        onChange={(e) =>
                          setSettlePaymentMethodId(e.target.value)
                        }
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-semibold text-gray-700 shadow-inner appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                        }}
                      >
                        <option value="">Selecione...</option>
                        {paymentMethods.map((pm) => (
                          <option key={pm.id} value={pm.id}>
                            {pm.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Observações
                      </label>
                      <textarea
                        value={settleObservation}
                        onChange={(e) => setSettleObservation(e.target.value)}
                        rows={3}
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-medium text-gray-700 shadow-inner resize-none placeholder-gray-300 text-sm"
                        placeholder="Opcional..."
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Tags
                      </label>
                      <div className="min-h-[46px] w-full px-2 py-1.5 bg-gray-50 border border-gray-100 rounded-xl focus-within:ring-4 focus-within:ring-blue-500/10 transition-all flex flex-wrap items-center gap-2 shadow-inner">
                        {settleTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-white text-blue-600 text-[10px] rounded-lg flex items-center gap-1 font-bold border border-blue-100 shadow-sm"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() =>
                                setSettleTags(
                                  settleTags.filter((t) => t !== tag)
                                )
                              }
                              className="text-gray-400 hover:text-red-500 ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={settleTagInput}
                          onChange={(e) => setSettleTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              const val = settleTagInput.trim();
                              if (val && !settleTags.includes(val))
                                setSettleTags([...settleTags, val]);
                              setSettleTagInput("");
                            } else if (
                              e.key === "Backspace" &&
                              !settleTagInput &&
                              settleTags.length > 0
                            ) {
                              setSettleTags(settleTags.slice(0, -1));
                            }
                          }}
                          placeholder={
                            settleTags.length === 0 ? "Adicionar tag..." : ""
                          }
                          className="flex-1 bg-transparent outline-none min-w-[80px] placeholder-gray-400 text-sm h-7"
                        />
                      </div>
                      {settleTagInput.trim().length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-[110] max-h-32 overflow-y-auto">
                          {availableTags
                            .filter(
                              (t) =>
                                t
                                  .toLowerCase()
                                  .includes(settleTagInput.toLowerCase()) &&
                                !settleTags.includes(t)
                            )
                            .map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => {
                                  setSettleTags([...settleTags, suggestion]);
                                  setSettleTagInput("");
                                }}
                                className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 text-gray-700 font-bold transition-colors"
                              >
                                #{suggestion}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Comprovante
                      </label>
                      <label className="cursor-pointer flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 hover:border-blue-400 transition-all group overflow-hidden relative min-h-[80px]">
                        {settleFile ? (
                          <div className="flex items-center gap-3 w-full">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 shrink-0">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-700 truncate">
                                {settleFile.name}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {(settleFile.size / 1024).toFixed(0)}KB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setSettleFile(null);
                              }}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <svg
                              className="w-6 h-6 text-gray-300 mx-auto mb-1 group-hover:text-blue-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                              />
                            </svg>
                            <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600">
                              Anexar Comprovante
                            </span>
                          </div>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) =>
                            setSettleFile(
                              e.target.files ? e.target.files[0] : null
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setSettleModalOpen(false)}
                    className="flex-1 py-4 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest border border-transparent hover:bg-gray-50 rounded-2xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-500/20 text-xs font-black transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Confirmar Efetivação
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
