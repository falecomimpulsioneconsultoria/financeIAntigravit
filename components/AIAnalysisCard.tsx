
import React, { useState } from 'react';
import { AIAnalysisResult } from '../types';
import { Button } from './ui/Button';

interface AIAnalysisCardProps {
  result: AIAnalysisResult | null;
  isLoading: boolean;
  onAnalyze: () => void;
  title?: string;
  subtitle?: string;
  buttonText?: string;
}

const AIStatusBadge = ({ status }: { status: AIAnalysisResult['status'] }) => {
    const config = {
        HEALTHY: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: 'shield-check', label: 'Saudável' },
        WARNING: { bg: 'bg-amber-100', text: 'text-amber-800', icon: 'exclamation', label: 'Atenção' },
        CRITICAL: { bg: 'bg-rose-100', text: 'text-rose-800', icon: 'lightning-bolt', label: 'Crítico' }
    };
    const c = config[status];

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${c.bg} ${c.text} font-bold text-xs uppercase tracking-wide shadow-sm`}>
            {status === 'HEALTHY' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            {status === 'WARNING' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            {status === 'CRITICAL' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            <span>{c.label}</span>
        </div>
    );
};

export const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({ 
    result, 
    isLoading, 
    onAnalyze, 
    title = "Consultor IA", 
    subtitle = "Análise de inteligência artificial",
    buttonText = "Gerar Análise"
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Dynamic border color based on status
    const borderColor = result 
        ? (result.status === 'HEALTHY' ? 'border-emerald-100' : result.status === 'WARNING' ? 'border-amber-100' : 'border-rose-100')
        : 'border-indigo-100';

    // Dynamic gradient header
    const gradientClass = result
        ? (result.status === 'HEALTHY' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : result.status === 'WARNING' ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-rose-500 to-red-600')
        : 'bg-gradient-to-r from-indigo-500 to-purple-500';

    return (
        <div className={`relative bg-white rounded-xl border transition-all duration-500 overflow-hidden shadow-sm ${borderColor}`}>
            
            {/* Header Gradient Strip */}
            <div className={`absolute top-0 left-0 w-full h-1.5 ${gradientClass}`}></div>

            <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg shadow-sm">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 leading-tight">{title}</h3>
                            <p className="text-xs text-gray-500">{subtitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {result && <AIStatusBadge status={result.status} />}
                        <Button onClick={onAnalyze} isLoading={isLoading} variant="secondary" size="sm" className="w-full md:w-auto text-xs font-semibold shadow-sm hover:shadow">
                            {result ? 'Atualizar' : buttonText}
                        </Button>
                    </div>
                </div>

                {!result && !isLoading && (
                    <div className="text-center py-10 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <div className="mb-2">✨</div>
                        <p className="text-sm">Clique em "{buttonText}" para obter insights.</p>
                    </div>
                )}

                {isLoading && (
                    <div className="py-12 flex flex-col items-center justify-center text-indigo-600 space-y-3 bg-gray-50/30 rounded-xl">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <p className="text-sm font-medium animate-pulse">Analisando dados...</p>
                    </div>
                )}

                {result && !isLoading && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Summary & Recommendation */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Resumo do Cenário</h4>
                                <p className="text-gray-800 font-medium leading-relaxed text-sm md:text-base">"{result.summary}"</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                                <h4 className="text-xs font-bold uppercase text-blue-800 tracking-wider mb-2 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Recomendação Principal
                                </h4>
                                <p className="text-blue-900 text-sm font-semibold">{result.recommendation}</p>
                            </div>
                        </div>

                        {/* Insights List */}
                        <div>
                            <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-3">Insights Identificados</h4>
                            <div className="space-y-2">
                                {result.insights.map((insight, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100">
                                        <div className="mt-1.5 min-w-[6px] h-1.5 rounded-full bg-indigo-400"></div>
                                        <p className="text-sm text-gray-600 leading-snug">{insight}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Expandable Section */}
                        <div className="pt-2 border-t border-gray-100">
                            <button 
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors group w-full justify-center md:justify-start py-2"
                            >
                                {isExpanded ? 'Ocultar Raciocínio' : 'Estender Raciocínio e Detalhes'}
                                <svg className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {isExpanded && (
                                <div className="mt-2 p-5 bg-gray-50 rounded-xl text-sm text-gray-700 leading-relaxed whitespace-pre-line border border-gray-200 animate-fade-in shadow-inner">
                                    <div className="flex items-center gap-2 mb-3 text-gray-900 font-bold border-b border-gray-200 pb-2">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        Análise Detalhada
                                    </div>
                                    {result.detailedReasoning}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
