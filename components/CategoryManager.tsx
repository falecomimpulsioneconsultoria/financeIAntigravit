
import React, { useState, useMemo } from 'react';
import { Category, TransactionType, DreCategory } from '../types';
import { Button } from './ui/Button';
import { CategoryForm } from './CategoryForm';
import { authService } from '../services/authService';
import { generateChartOfAccounts } from '../services/geminiService';
import { dataService } from '../services/dataService';

interface CategoryManagerProps {
    categories: Category[];
    onAdd: (category: Omit<Category, 'id'>) => void;
    onEdit: (id: string, category: Omit<Category, 'id'>) => void;
    onDelete: (id: string) => void;
}

// Interface estendida para uso interno na renderização recursiva
interface TreeNode extends Category {
    code: string;
    children: TreeNode[];
    depth: number;
}

// Mapa de Hierarquia Legível do DRE
const dreHierarchyMap: Record<string, string> = {
    'DRE_GROSS_REVENUE': 'Receita > Operacional Bruta',
    'DRE_TAXES': 'Deduções > Impostos',
    'DRE_COSTS': 'Custos > Diretos/Serviço',
    'DRE_EXPENSE_PERSONNEL': 'Desp. Operacional > Pessoal',
    'DRE_EXPENSE_COMMERCIAL': 'Desp. Operacional > Comercial',
    'DRE_EXPENSE_ADMIN': 'Desp. Operacional > Administrativa',
    'DRE_FINANCIAL_INCOME': 'Resultado Financeiro > Receitas',
    'DRE_FINANCIAL_EXPENSE': 'Resultado Financeiro > Despesas',
};

// Componente para exibir a hierarquia de forma elegante
const DreHierarchyLabel = ({ code }: { code?: DreCategory }) => {
    if (!code || !dreHierarchyMap[code]) return <span className="text-xs text-gray-300 italic">Não classificado</span>;
    const parts = dreHierarchyMap[code].split(' > ');
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 text-xs text-gray-600">
            <span className="font-semibold uppercase tracking-tight text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 w-fit">{parts[0]}</span>
            <span className="hidden sm:inline text-gray-300">›</span>
            <span className="truncate">{parts[1]}</span>
        </div>
    );
};

export const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onAdd, onEdit, onDelete }) => {
    const [activeTab, setActiveTab] = useState<TransactionType>('EXPENSE');
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // AI Modal State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiActivity, setAiActivity] = useState('');
    const [aiDetailLevel, setAiDetailLevel] = useState<'SIMPLE' | 'DETAILED'>('SIMPLE');
    const [isGenerating, setIsGenerating] = useState(false);

    // Permissions Check
    const currentUser = authService.getCurrentUser();
    const canManage = currentUser?.activePermissions?.manageCategories;

    // State to track expanded categories
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(categories.map(c => c.id)));

    // --- RECURSIVE TREE BUILDER ---
    const treeData = useMemo(() => {
        const typeCategories = categories.filter(c => c.type === activeTab);
        // Remove default prefix ('1' or '2'). Roots will be 1, 2, 3...
        const rootPrefix = '';

        const buildTree = (parentId: string | undefined, prefix: string, depth: number): TreeNode[] => {
            return typeCategories
                .filter(c => c.parentId === parentId || (!parentId && !c.parentId))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c, index) => {
                    // Logic Update: If prefix is empty, code is index+1. Else append.
                    const currentCode = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
                    return {
                        ...c,
                        code: currentCode,
                        depth: depth,
                        children: buildTree(c.id, currentCode, depth + 1)
                    };
                });
        };

        return buildTree(undefined, rootPrefix, 0);
    }, [categories, activeTab]);

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedCategories(newExpanded);
    };

    const handleEditClick = (category: Category) => {
        if (!canManage) return;
        setEditingId(category.id);
        setIsEditing(true);
    };

    const handleDeleteClick = (id: string) => {
        if (!canManage) return;
        if (window.confirm('Tem certeza? Se esta categoria tiver subcategorias ou lançamentos, isso pode gerar inconsistências.')) {
            onDelete(id);
        }
    };

    const handleFormSubmit = (data: Omit<Category, 'id'>) => {
        if (editingId) {
            onEdit(editingId, data);
        } else {
            onAdd(data);
        }
        setIsEditing(false);
        setEditingId(null);
    };

    // AI Handler
    const handleGenerateAI = async () => {
        if (!currentUser) return;
        if (!aiActivity.trim()) {
            alert("Por favor, descreva sua atividade.");
            return;
        }
        setIsGenerating(true);
        try {
            const generatedData = await generateChartOfAccounts(currentUser.accountType, aiActivity, aiDetailLevel);
            if (generatedData && generatedData.length > 0) {
                await dataService.createCategoriesBatch(currentUser.id, generatedData);
                alert("Plano de contas gerado com sucesso! A página será atualizada.");
                window.location.reload();
            } else {
                alert("A IA não retornou categorias válidas. Tente detalhar mais.");
            }
        } catch (error) {
            alert("Erro ao gerar plano de contas.");
        } finally {
            setIsGenerating(false);
            setIsAiModalOpen(false);
        }
    };

    // --- RECURSIVE ROW COMPONENT ---
    const CategoryRow: React.FC<{ node: TreeNode }> = ({ node }) => {
        const isExpanded = expandedCategories.has(node.id);
        const hasChildren = node.children.length > 0;
        const isIncome = node.type === 'INCOME';

        // Visual Styles based on Type
        // Using stronger colors for differentiation
        const typeConfig = isIncome
            ? { label: 'REC', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', hover: 'hover:bg-emerald-50/50' }
            : { label: 'DESP', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', hover: 'hover:bg-rose-50/50' };

        // Calculate indentation padding
        const paddingLeft = node.depth * 24; // 24px per level

        return (
            <React.Fragment>
                <div className={`group relative flex flex-col md:flex-row md:items-center p-3 md:py-3 md:px-4 ${typeConfig.hover} transition-all border-l-4 ${node.depth === 0 ? (isIncome ? 'border-emerald-400' : 'border-rose-400') : 'border-gray-200 md:border-transparent'} border-b border-gray-50`}>

                    {/* Column 1: Category Info with Indentation */}
                    <div className="flex-1 flex items-center gap-3" style={{ paddingLeft: node.depth > 0 ? `${paddingLeft}px` : 0 }}>

                        {/* Tree Connector Lines (Visual Only for Depth > 0 on Desktop) */}
                        {node.depth > 0 && (
                            <div className="hidden md:block w-4 h-4 border-l border-b border-gray-300 -ml-4 -mt-0.5 rounded-bl-md absolute" style={{ left: `${paddingLeft + 16}px` }}></div>
                        )}

                        {/* Code Box with Type Tag */}
                        <div
                            className={`
                            flex flex-col items-center justify-center border shadow-sm shrink-0 rounded-lg cursor-pointer transition-all
                            ${node.depth === 0 ? 'w-12 h-12' : 'w-auto h-8 px-2 min-w-[3rem]'}
                            ${typeConfig.bg} ${typeConfig.border} ${typeConfig.text}
                        `}
                            onClick={() => hasChildren && toggleExpand(node.id)}
                            title={hasChildren ? (isExpanded ? "Recolher" : "Expandir") : ""}
                        >
                            {/* Type Label (REC/DESP) */}
                            <span className={`text-[8px] font-extrabold uppercase opacity-80 leading-none ${node.depth === 0 ? 'mb-0.5' : 'mb-px'}`}>
                                {typeConfig.label}
                            </span>

                            <div className="flex items-center">
                                <span className={`font-bold font-mono leading-none ${node.depth === 0 ? 'text-sm' : 'text-xs'}`}>
                                    {node.code}
                                </span>
                                {hasChildren && (
                                    <svg className={`w-2.5 h-2.5 ml-1 opacity-60 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-0.5 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full bg-${node.color}-500 shadow-sm ring-2 ring-white`}></div>
                                <h3 className={`text-gray-800 ${node.depth === 0 ? 'font-bold text-base' : 'font-medium text-sm'}`}>{node.name}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: DRE Info */}
                    <div className="mt-1 md:mt-0 md:w-1/3 md:pl-4 md:border-l md:border-gray-100 h-full flex items-center pl-14 md:pl-4">
                        {node.dreCategory && (
                            <DreHierarchyLabel code={node.dreCategory} />
                        )}
                    </div>

                    {/* Column 3: Actions */}
                    {canManage && (
                        <div className="mt-2 md:mt-0 md:w-20 flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity pl-14 md:pl-0">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleEditClick(node); }}
                                className="p-1.5 text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 rounded-md transition-colors shadow-sm"
                                title="Editar"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(node.id); }}
                                className="p-1.5 text-rose-600 bg-white hover:bg-rose-50 border border-gray-200 rounded-md transition-colors shadow-sm"
                                title="Excluir"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Render Children Recursively */}
                {hasChildren && isExpanded && (
                    <div className="animate-fade-in">
                        {node.children.map(child => (
                            <CategoryRow key={child.id} node={child} />
                        ))}
                    </div>
                )}
            </React.Fragment>
        );
    };

    if (isEditing) {
        const initialData = editingId ? categories.find(c => c.id === editingId) : undefined;
        return (
            <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg border border-gray-100 animate-scale-in">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h2>
                    <button onClick={() => { setIsEditing(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <CategoryForm
                    categories={categories}
                    initialData={initialData}
                    onSubmit={handleFormSubmit}
                    onCancel={() => { setIsEditing(false); setEditingId(null); }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in relative">

            {/* Header & Tabs */}
            <div className="flex flex-col xl:flex-row justify-between items-center gap-6">

                {/* Tabs */}
                <div className="bg-gray-100 p-1 rounded-xl flex w-full xl:w-auto shadow-inner order-2 xl:order-1">
                    <button
                        onClick={() => setActiveTab('EXPENSE')}
                        className={`flex-1 xl:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'EXPENSE'
                                ? 'bg-white text-rose-600 shadow-sm ring-1 ring-rose-100'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            }`}
                    >
                        Despesas
                    </button>
                    <button
                        onClick={() => setActiveTab('INCOME')}
                        className={`flex-1 xl:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'INCOME'
                                ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            }`}
                    >
                        Receitas
                    </button>
                </div>

                {canManage && (
                    <div className="flex gap-2 w-full xl:w-auto order-1 xl:order-2">
                        <Button onClick={() => setIsAiModalOpen(true)} variant="secondary" className="w-full xl:w-auto bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100">
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Gerar com IA
                        </Button>
                        <Button onClick={() => setIsEditing(true)} className="shadow-md shadow-blue-500/20 w-full xl:w-auto">
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Nova Categoria
                        </Button>
                    </div>
                )}
            </div>

            {/* Categories List */}
            {treeData.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    </div>
                    <p className="text-gray-500 font-medium">Nenhuma categoria encontrada.</p>
                    <p className="text-sm text-gray-400 mt-1">Crie manualmente ou use a IA para gerar um plano de contas.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Table Header - Visible on Desktop */}
                    <div className="hidden md:flex px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <div className="flex-1">Categoria</div>
                        <div className="w-1/3 pl-4 border-l border-gray-200/50">Grupo do DRE</div>
                        <div className="w-20 text-right">Ações</div>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {treeData.map(node => (
                            <CategoryRow key={node.id} node={node} />
                        ))}
                    </div>
                </div>
            )}

            {/* AI PLAN MODAL */}
            {isAiModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold">Gerador de Plano de Contas</h3>
                                    <p className="text-purple-100 text-sm mt-1">A IA criará categorias ideais para seu perfil.</p>
                                </div>
                                <div className="bg-white/20 p-2 rounded-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">

                            {/* Current Context */}
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex gap-3 items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentUser?.accountType === 'BUSINESS' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                    {currentUser?.accountType === 'BUSINESS' ? 'PJ' : 'PF'}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase">Perfil Detectado</p>
                                    <p className="text-sm font-bold text-gray-800">
                                        {currentUser?.accountType === 'BUSINESS' ? 'Empresarial (CNPJ)' : 'Pessoa Física (CPF)'}
                                    </p>
                                </div>
                            </div>

                            {/* Question 1: Activity */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">1. Qual sua profissão ou atividade principal?</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                    rows={2}
                                    placeholder={currentUser?.accountType === 'BUSINESS' ? "Ex: Agência de Marketing Digital, Padaria, Consultório Médico..." : "Ex: Estudante universitário, Engenheiro Civil, Aposentado..."}
                                    value={aiActivity}
                                    onChange={(e) => setAiActivity(e.target.value)}
                                />
                            </div>

                            {/* Question 2: Detail Level */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">2. Nível de detalhe desejado?</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setAiDetailLevel('SIMPLE')}
                                        className={`p-3 rounded-xl border text-left transition-all ${aiDetailLevel === 'SIMPLE' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <span className="font-bold block mb-1">Simples</span>
                                        <span className="text-xs opacity-80">Categorias essenciais para controle rápido.</span>
                                    </button>
                                    <button
                                        onClick={() => setAiDetailLevel('DETAILED')}
                                        className={`p-3 rounded-xl border text-left transition-all ${aiDetailLevel === 'DETAILED' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <span className="font-bold block mb-1">Detalhado</span>
                                        <span className="text-xs opacity-80">Estrutura completa para análise profunda.</span>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <Button variant="secondary" onClick={() => setIsAiModalOpen(false)} className="flex-1" disabled={isGenerating}>Cancelar</Button>
                                <Button onClick={handleGenerateAI} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20" isLoading={isGenerating}>
                                    {isGenerating ? 'Criando Estrutura...' : 'Gerar Plano'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
