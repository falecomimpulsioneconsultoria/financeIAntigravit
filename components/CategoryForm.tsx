
import React, { useState, useMemo } from 'react';
import { Category, TransactionType, DreCategory } from '../types';
import { Button } from './ui/Button';

interface CategoryFormProps {
  categories: Category[];
  initialData?: Category;
  onSubmit: (category: Omit<Category, 'id'>) => void;
  onCancel: () => void;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({ categories, initialData, onSubmit, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<TransactionType>(initialData?.type || 'EXPENSE');
  const [color, setColor] = useState(initialData?.color || 'gray');
  const [parentId, setParentId] = useState(initialData?.parentId || '');
  const [dreCategory, setDreCategory] = useState<DreCategory | ''>(initialData?.dreCategory || '');
  const [budgetLimit, setBudgetLimit] = useState(initialData?.budgetLimit?.toString() || '');

  // Flatten the tree for the select box, but adding visual indentation
  // Also filters out the current category and its descendants to prevent circular references
  const parentOptions = useMemo(() => {
      const typeCats = categories.filter(c => c.type === type);
      
      // Recursive function to get descendants IDs
      const getDescendants = (id: string): string[] => {
          const children = categories.filter(c => c.parentId === id);
          let descendants = children.map(c => c.id);
          children.forEach(c => {
              descendants = [...descendants, ...getDescendants(c.id)];
          });
          return descendants;
      };

      const excludedIds = initialData ? [initialData.id, ...getDescendants(initialData.id)] : [];

      // Recursive build for options with depth
      const buildOptions = (pId: string | undefined, depth: number, prefix: string): {id: string, name: string, depth: number, code: string}[] => {
          const children = typeCats
              .filter(c => c.parentId === pId || (!pId && !c.parentId))
              .sort((a, b) => a.name.localeCompare(b.name));
          
          let result: {id: string, name: string, depth: number, code: string}[] = [];
          
          children.forEach((c, index) => {
              if (excludedIds.includes(c.id)) return;
              
              // Logic Update: If prefix is empty (root), code is simply index+1. Else append.
              const currentCode = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
              result.push({ id: c.id, name: c.name, depth, code: currentCode });
              result = [...result, ...buildOptions(c.id, depth + 1, currentCode)];
          });
          
          return result;
      };

      // Root prefix is empty string now to start from 1, 2, 3
      return buildOptions(undefined, 0, '');

  }, [categories, type, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      type,
      color,
      parentId: parentId || undefined,
      dreCategory: dreCategory || undefined,
      budgetLimit: budgetLimit ? parseFloat(budgetLimit) : undefined
    });
  };

  const colors = [
    { name: 'Cinza', value: 'gray', class: 'bg-gray-500' },
    { name: 'Vermelho', value: 'red', class: 'bg-red-500' },
    { name: 'Laranja', value: 'orange', class: 'bg-orange-500' },
    { name: 'Amarelo', value: 'yellow', class: 'bg-yellow-500' },
    { name: 'Verde', value: 'green', class: 'bg-green-500' },
    { name: 'Esmeralda', value: 'emerald', class: 'bg-emerald-500' },
    { name: 'Azul', value: 'blue', class: 'bg-blue-500' },
    { name: 'Indigo', value: 'indigo', class: 'bg-indigo-500' },
    { name: 'Roxo', value: 'purple', class: 'bg-purple-500' },
    { name: 'Rosa', value: 'pink', class: 'bg-pink-500' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Type Toggle */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => { setType('INCOME'); setParentId(''); setDreCategory(''); }}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
            type === 'INCOME' 
              ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
          Receita
        </button>
        <button
          type="button"
          onClick={() => { setType('EXPENSE'); setParentId(''); setDreCategory(''); }}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
            type === 'EXPENSE' 
              ? 'bg-white text-rose-600 shadow-sm ring-1 ring-black/5' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>
          Despesa
        </button>
      </div>

      {/* Inputs */}
      <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Categoria</label>
            <input 
            required
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder-gray-400"
            placeholder="Ex: Alimentação, Mercado, Salário"
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{type === 'INCOME' ? 'Meta de Receita (Mensal)' : 'Limite de Gastos (Mensal)'}</label>
            <div className="relative">
                <span className="absolute left-4 top-2.5 text-gray-500 font-medium">R$</span>
                <input 
                    type="number"
                    step="0.01"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder-gray-400"
                    placeholder="0,00"
                />
            </div>
            <p className="text-xs text-gray-400 mt-1 ml-1">Deixe em branco ou 0 para não definir meta.</p>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subcategoria de (Opcional)</label>
            <select 
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-600"
            >
                <option value="">Nenhuma (É uma categoria principal)</option>
                {parentOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>
                        {/* Visual Indentation using unicode space */}
                        {'\u00A0'.repeat(opt.depth * 4)}
                        {opt.code} - {opt.name}
                    </option>
                ))}
            </select>
        </div>

        {/* DRE Selection */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
           <label className="block text-sm font-bold text-blue-900 mb-1">Mapeamento para DRE (Relatório)</label>
           <p className="text-xs text-blue-700 mb-2">Onde esta categoria deve aparecer no Demonstrativo de Resultados?</p>
           
           <select 
              value={dreCategory}
              onChange={(e) => setDreCategory(e.target.value as DreCategory)}
              className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 text-sm"
           >
              <option value="">-- Não mapeado no DRE --</option>
              
              {type === 'INCOME' && (
                <>
                  <optgroup label="Operacional">
                    <option value="DRE_GROSS_REVENUE">(+) Receita Bruta (Comissões)</option>
                  </optgroup>
                  <optgroup label="Financeiro">
                    <option value="DRE_FINANCIAL_INCOME">(+) Receita Financeira (Rendimentos)</option>
                  </optgroup>
                </>
              )}

              {type === 'EXPENSE' && (
                <>
                  <optgroup label="Deduções e Custos">
                    <option value="DRE_TAXES">(-) Impostos sobre Vendas (Simples/ISS)</option>
                    <option value="DRE_COSTS">(-) Custo do Serviço (Comissões Pagas/Repassadas)</option>
                  </optgroup>
                  <optgroup label="Despesas Operacionais">
                    <option value="DRE_EXPENSE_PERSONNEL">(-) Despesas com Pessoal (Pró-labore/Salários)</option>
                    <option value="DRE_EXPENSE_COMMERCIAL">(-) Despesas Comerciais (Viagem/Combustível)</option>
                    <option value="DRE_EXPENSE_ADMIN">(-) Despesas Administrativas (Escritório/Contador)</option>
                  </optgroup>
                  <optgroup label="Financeiro">
                     <option value="DRE_FINANCIAL_EXPENSE">(-) Despesa Financeira (Juros/Tarifas)</option>
                  </optgroup>
                </>
              )}
           </select>
        </div>
      </div>

      {/* Color Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Cor da Etiqueta</label>
        <div className="grid grid-cols-5 gap-3 sm:gap-4">
          {colors.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`group relative w-full aspect-square rounded-full flex items-center justify-center transition-transform hover:scale-105 focus:outline-none ${color === c.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
              title={c.name}
            >
              <div className={`w-full h-full rounded-full ${c.class} shadow-sm border border-black/5`}></div>
              {color === c.value && (
                  <svg className="absolute w-5 h-5 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-6">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 text-gray-500 hover:bg-gray-100">Cancelar</Button>
        <Button type="submit" className="flex-1 shadow-lg shadow-blue-500/20">
            {initialData ? 'Salvar Alterações' : 'Criar Categoria'}
        </Button>
      </div>
    </form>
  );
};
