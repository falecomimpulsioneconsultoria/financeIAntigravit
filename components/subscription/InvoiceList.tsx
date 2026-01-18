import React from 'react';
import { Invoice } from '../../types';

interface InvoiceListProps {
    invoices: Invoice[];
}

export const InvoiceList: React.FC<InvoiceListProps> = ({ invoices }) => {
    return (
        <div className="bg-white rounded-[1.5rem] border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Histórico de Faturas</h4>
                <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase">Ver Todas</button>
            </div>
            
            {invoices.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Nenhuma fatura encontrada.</div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {invoices.map((invoice) => (
                        <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    invoice.status === 'PAID' ? 'bg-green-50 text-green-600' :
                                    invoice.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                                    'bg-red-50 text-red-600'
                                }`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Fatura #{invoice.referenceMonth.replace('/', '')}</p>
                                    <p className="text-xs text-gray-500 font-medium">Vencimento: {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <p className="text-sm font-black text-gray-900">R$ {invoice.amount.toFixed(2)}</p>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                     invoice.status === 'PAID' ? 'text-green-600' :
                                     invoice.status === 'PENDING' ? 'text-amber-600' :
                                     'text-red-600'
                                }`}>
                                    {invoice.status === 'PAID' ? 'PAGO' : invoice.status === 'PENDING' ? 'ABERTO' : 'ATRASADO'}
                                </span>
                            </div>

                            <a href={invoice.pdfUrl} className="p-2 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
