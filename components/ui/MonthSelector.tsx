import React from 'react';

interface MonthSelectorProps {
    selectedDate: Date;
    onChange: (date: Date) => void;
    className?: string;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ selectedDate, onChange, className = "" }) => {
    const handleMonthChange = (offset: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + offset);
        onChange(newDate);
    };

    return (
        <div className={`flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm ${className}`}>
            <button
                onClick={() => handleMonthChange(-1)}
                className="p-2 hover:bg-gray-50 text-gray-400 hover:text-gray-600 rounded-lg transition-all"
                title="Mês Anterior"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            <div className="flex-1 px-4 text-center min-w-[140px]">
                <span className="text-sm font-bold text-gray-700 capitalize">
                    {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
            </div>

            <button
                onClick={() => handleMonthChange(1)}
                className="p-2 hover:bg-gray-50 text-gray-400 hover:text-gray-600 rounded-lg transition-all"
                title="Próximo Mês"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </div>
    );
};
