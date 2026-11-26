import { jsPDF } from "jspdf";
import autoTable, { CellDef, Styles } from "jspdf-autotable";
import { Account, Category, Contact, Transaction } from "../types";

export interface TransactionExportSummary {
  incomeRealized: number;
  incomePending: number;
  expenseRealized: number;
  expensePending: number;
}

export interface TransactionExportFilters {
  startDate: string;
  endDate: string;
  ignoreDate: boolean;
  filterType: "ALL" | "INCOME" | "EXPENSE" | "TRANSFER";
  filterStatus: "ALL" | "PAID" | "PENDING" | "PARTIAL";
  filterCategory: string;
  filterAccount: string;
  filterTag: string;
  filterContact: string;
  searchQuery: string;
}

export interface TransactionVisibleColumns {
  vencimento: boolean;
  tipo: boolean;
  categoria: boolean;
  pessoa: boolean;
  descricao: boolean;
  conta: boolean;
  previsto: boolean;
  realizado: boolean;
  saldo: boolean;
  status: boolean;
  acoes?: boolean;
}

export interface ExportTransactionsPdfParams {
  transactions: Transaction[];
  childrenMap: Map<string, Transaction[]>;
  accounts: Account[];
  categories: Category[];
  contacts: Contact[];
  summary: TransactionExportSummary;
  filters: TransactionExportFilters;
  visibleColumns: TransactionVisibleColumns;
}

type RgbColor = [number, number, number];

const COLORS = {
  ink: [15, 23, 42] as RgbColor,
  slate: [71, 85, 105] as RgbColor,
  muted: [148, 163, 184] as RgbColor,
  border: [226, 232, 240] as RgbColor,
  surface: [248, 250, 252] as RgbColor,
  white: [255, 255, 255] as RgbColor,
  headerBg: [15, 23, 42] as RgbColor,
  emerald: [5, 150, 105] as RgbColor,
  emeraldSoft: [52, 211, 153] as RgbColor,
  rose: [225, 29, 72] as RgbColor,
  roseSoft: [251, 113, 133] as RgbColor,
  amber: [217, 119, 6] as RgbColor,
  blue: [37, 99, 235] as RgbColor,
};

const formatCurrency = (value: number): string =>
  `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateBr = (isoDate: string): string => {
  if (!isoDate) return "-";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
};

const getTransactionTypeLabel = (type: Transaction["type"]): string => {
  if (type === "INCOME") return "Receita";
  if (type === "EXPENSE") return "Despesa";
  return "Transf.";
};

const getTransactionTypeColor = (type: Transaction["type"]): RgbColor => {
  if (type === "INCOME") return COLORS.emerald;
  if (type === "EXPENSE") return COLORS.rose;
  return COLORS.blue;
};

const getTransactionFinancials = (
  tx: Transaction,
  childrenMap: Map<string, Transaction[]>
) => {
  const children = childrenMap.get(tx.id) || [];
  const hasChildren = children.length > 0;
  const totalRealized = children.reduce(
    (sum, child) => sum + (child.status === "PAID" ? child.amount : 0),
    0
  );
  const isFullyPaid = tx.status === "PAID";
  const realized = hasChildren ? totalRealized : isFullyPaid ? tx.amount : 0;
  const balance = Math.max(0, tx.amount - realized);
  const todayIso = new Date().toISOString().split("T")[0];
  const isPartial = !isFullyPaid && totalRealized > 0;
  const isOverdue = !isFullyPaid && tx.date < todayIso;

  let statusLabel = "Pendente";
  let statusColor: RgbColor = COLORS.slate;

  if (isFullyPaid) {
    statusLabel = "Liquidado";
    statusColor = COLORS.emerald;
  } else if (isPartial) {
    statusLabel = "Parcial";
    statusColor = COLORS.amber;
  } else if (isOverdue) {
    statusLabel = "Atrasado";
    statusColor = COLORS.rose;
  }

  return { realized, balance, statusLabel, statusColor };
};

const buildActiveFiltersLabel = (
  filters: TransactionExportFilters,
  accounts: Account[],
  categories: Category[],
  contacts: Contact[]
): string => {
  const active: string[] = [];

  if (filters.filterType !== "ALL") {
    const typeMap = {
      INCOME: "Receitas",
      EXPENSE: "Despesas",
      TRANSFER: "Transferências",
    };
    active.push(`Tipo: ${typeMap[filters.filterType]}`);
  }

  if (filters.filterStatus !== "ALL") {
    const statusMap = {
      PAID: "Liquidados",
      PENDING: "Pendentes",
      PARTIAL: "Parciais",
    };
    active.push(`Status: ${statusMap[filters.filterStatus]}`);
  }

  if (filters.filterCategory !== "ALL") {
    const categoryName =
      categories.find((c) => c.id === filters.filterCategory)?.name ||
      "Selecionada";
    active.push(`Categoria: ${categoryName}`);
  }

  if (filters.filterAccount !== "ALL") {
    const accountName =
      accounts.find((a) => a.id === filters.filterAccount)?.name ||
      "Selecionada";
    active.push(`Conta: ${accountName}`);
  }

  if (filters.filterContact !== "ALL") {
    const contactName =
      contacts.find((c) => c.id === filters.filterContact)?.fantasyName ||
      "Selecionado";
    active.push(`Pessoa: ${contactName}`);
  }

  if (filters.filterTag !== "ALL") {
    active.push(`Tag: #${filters.filterTag}`);
  }

  if (filters.searchQuery.trim()) {
    active.push(`Busca: "${filters.searchQuery.trim()}"`);
  }

  return active.join("  •  ");
};

const drawHeader = (
  doc: jsPDF,
  pageWidth: number,
  marginX: number,
  periodLabel: string,
  totalCount: number,
  activeFiltersLabel: string
): number => {
  const headerHeight = activeFiltersLabel ? 26 : 21;

  doc.setFillColor(...COLORS.headerBg);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Extrato de Lançamentos", marginX, 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text("Finances IA  •  Relatório Financeiro", marginX, 15.5);

  const generatedAt = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Período: ${periodLabel}`, pageWidth - marginX, 9.5, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `${totalCount} ${totalCount === 1 ? "lançamento" : "lançamentos"}  •  Gerado em ${generatedAt}`,
    pageWidth - marginX,
    15,
    { align: "right" }
  );

  if (activeFiltersLabel) {
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    const truncated = doc.splitTextToSize(
      `Filtros ativos: ${activeFiltersLabel}`,
      pageWidth - marginX * 2
    );
    doc.text(truncated[0], marginX, 22);
  }

  return headerHeight + 6;
};

const drawSummaryCards = (
  doc: jsPDF,
  pageWidth: number,
  marginX: number,
  startY: number,
  summary: TransactionExportSummary
): number => {
  const realizedBalance = summary.incomeRealized - summary.expenseRealized;
  const projectedBalance =
    summary.incomeRealized +
    summary.incomePending -
    (summary.expenseRealized + summary.expensePending);

  const cards: Array<{ label: string; value: number; color: RgbColor }> = [
    {
      label: "RECEITAS REALIZADAS",
      value: summary.incomeRealized,
      color: COLORS.emerald,
    },
    {
      label: "RECEITAS PENDENTES",
      value: summary.incomePending,
      color: COLORS.emeraldSoft,
    },
    {
      label: "DESPESAS REALIZADAS",
      value: summary.expenseRealized,
      color: COLORS.rose,
    },
    {
      label: "DESPESAS PENDENTES",
      value: summary.expensePending,
      color: COLORS.roseSoft,
    },
    {
      label: "SALDO REALIZADO",
      value: realizedBalance,
      color: realizedBalance >= 0 ? COLORS.blue : COLORS.rose,
    },
    {
      label: "SALDO PROJETADO",
      value: projectedBalance,
      color: projectedBalance >= 0 ? COLORS.ink : COLORS.rose,
    },
  ];

  const gap = 3;
  const usableWidth = pageWidth - marginX * 2;
  const cardWidth = (usableWidth - gap * (cards.length - 1)) / cards.length;
  const cardHeight = 16;

  cards.forEach((card, index) => {
    const x = marginX + index * (cardWidth + gap);

    doc.setFillColor(...COLORS.surface);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 1.5, 1.5, "FD");

    doc.setFillColor(...card.color);
    doc.rect(x, startY + 1.5, 1.2, cardHeight - 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(...COLORS.muted);
    doc.text(card.label, x + 3.5, startY + 5.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...card.color);
    doc.text(formatCurrency(card.value), x + 3.5, startY + 12.2);
  });

  return startY + cardHeight + 6;
};

type ColumnKey = Exclude<keyof TransactionVisibleColumns, "acoes">;

interface ColumnSpec {
  key: ColumnKey;
  header: string;
  halign: "left" | "center" | "right";
}

const ALL_COLUMNS: ColumnSpec[] = [
  { key: "vencimento", header: "Vencimento", halign: "center" },
  { key: "tipo", header: "Tipo", halign: "center" },
  { key: "categoria", header: "Categoria", halign: "left" },
  { key: "pessoa", header: "Pessoa / Forn.", halign: "left" },
  { key: "descricao", header: "Descrição", halign: "left" },
  { key: "conta", header: "Conta", halign: "left" },
  { key: "previsto", header: "Previsto", halign: "right" },
  { key: "realizado", header: "Realizado", halign: "right" },
  { key: "saldo", header: "Saldo", halign: "right" },
  { key: "status", header: "Status", halign: "center" },
];

export const exportTransactionsToPdf = ({
  transactions,
  childrenMap,
  accounts,
  categories,
  contacts,
  summary,
  filters,
  visibleColumns,
}: ExportTransactionsPdfParams): void => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;

  const periodLabel = filters.ignoreDate
    ? "Todos os períodos"
    : `${formatDateBr(filters.startDate)} a ${formatDateBr(filters.endDate)}`;

  const activeFiltersLabel = buildActiveFiltersLabel(
    filters,
    accounts,
    categories,
    contacts
  );

  const summaryY = drawHeader(
    doc,
    pageWidth,
    marginX,
    periodLabel,
    transactions.length,
    activeFiltersLabel
  );

  const tableStartY = drawSummaryCards(
    doc,
    pageWidth,
    marginX,
    summaryY,
    summary
  );

  const selectedColumns = ALL_COLUMNS.filter((col) => visibleColumns[col.key]);
  const columnsToRender =
    selectedColumns.length > 0 ? selectedColumns : ALL_COLUMNS;

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const contactMap = new Map(contacts.map((c) => [c.id, c.fantasyName]));

  const headRow: CellDef[] = columnsToRender.map((col) => ({
    content: col.header,
    styles: { halign: col.halign },
  }));

  const bodyRows: CellDef[][] = transactions.map((tx) => {
    const { realized, balance, statusLabel, statusColor } =
      getTransactionFinancials(tx, childrenMap);
    const typeColor = getTransactionTypeColor(tx.type);
    const recurrenceSuffix = tx.isRecurring
      ? tx.recurringType === "FIXED"
        ? " (Fixo)"
        : ` (${tx.installmentCurrent}/${tx.installmentTotal})`
      : "";

    const cellValues: Record<ColumnKey, CellDef> = {
      vencimento: { content: formatDateBr(tx.date) },
      tipo: {
        content: getTransactionTypeLabel(tx.type),
        styles: { textColor: typeColor, fontStyle: "bold" },
      },
      categoria: {
        content: tx.categoryId ? categoryMap.get(tx.categoryId) || "-" : "-",
      },
      pessoa: {
        content: tx.contactId ? contactMap.get(tx.contactId) || "-" : "-",
      },
      descricao: { content: `${tx.description}${recurrenceSuffix}` },
      conta: { content: accountMap.get(tx.accountId) || "-" },
      previsto: {
        content: formatCurrency(tx.amount),
        styles: { textColor: typeColor, fontStyle: "bold" },
      },
      realizado: { content: formatCurrency(realized) },
      saldo: {
        content: formatCurrency(balance),
        styles:
          balance > 0 && realized > 0
            ? { textColor: COLORS.amber, fontStyle: "bold" }
            : undefined,
      },
      status: {
        content: statusLabel,
        styles: { textColor: statusColor, fontStyle: "bold" },
      },
    };

    return columnsToRender.map((col) => cellValues[col.key]);
  });

  const columnStyles: Record<number, Partial<Styles>> = {};
  columnsToRender.forEach((col, index) => {
    columnStyles[index] = { halign: col.halign };
    if (col.key === "vencimento") columnStyles[index].cellWidth = 22;
    if (col.key === "tipo") columnStyles[index].cellWidth = 18;
    if (col.key === "status") columnStyles[index].cellWidth = 22;
    if (col.key === "previsto" || col.key === "realizado" || col.key === "saldo") {
      columnStyles[index].cellWidth = 26;
    }
  });

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX, bottom: 14 },
    head: [headRow],
    body: bodyRows,
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: { top: 2.2, right: 2.5, bottom: 2.2, left: 2.5 },
      textColor: COLORS.ink,
      lineColor: COLORS.border,
      lineWidth: 0.1,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: { top: 2.8, right: 2.5, bottom: 2.8, left: 2.5 },
    },
    alternateRowStyles: {
      fillColor: COLORS.surface,
    },
    columnStyles,
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.muted);
    doc.text("Finances IA — Extrato de Lançamentos", marginX, pageHeight - 6);
    doc.text(
      `Página ${page} de ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 6,
      { align: "right" }
    );
  }

  const fileName = filters.ignoreDate
    ? `lancamentos_completo_${new Date().toISOString().split("T")[0]}.pdf`
    : `lancamentos_${filters.startDate}_a_${filters.endDate}.pdf`;

  doc.save(fileName);
};
