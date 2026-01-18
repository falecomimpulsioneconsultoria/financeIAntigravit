import React from 'react';
import { User } from '../../types';

interface PaymentWallProps {
    user: User;
    onSimulatePayment: () => void; // Para fins de demonstração
}

export const PaymentWall: React.FC<PaymentWallProps> = ({ user, onSimulatePayment }) => {
    if (user.paymentStatus !== 'SUSPENDED') return null;

    return (
        <div className="fixed inset-0 z-50 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden text-center relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
                
                <div className="p-10">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-black text-gray-900 mb-2">Acesso Suspenso</h2>
                    <p className="text-gray-500 mb-8">
                        Identificamos uma pendência financeira em sua conta superior a 3 dias. 
                        Para continuar utilizando o sistema, é necessário regularizar sua assinatura.
                    </p>

                    <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100 mb-8">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Valor em Aberto</span>
                            <span className="text-xl font-black text-gray-900">R$ {user.subscriptionPrice?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vencimento</span>
                            <span className="text-sm font-bold text-red-500">{new Date(user.expirationDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>

                    <button 
                        onClick={onSimulatePayment}
                        className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black rounded-xl shadow-xl shadow-red-200 hover:shadow-2xl hover:scale-[1.02] transition-all uppercase tracking-wider text-sm"
                    >
                        Regularizar Agora
                    </button>
                    
                    <p className="mt-6 text-xs text-gray-400">
                        Pagamento via PIX libera o acesso imediatamente.
                        <br />
                        Dúvidas? Entre em contato com o suporte.
                    </p>
                </div>
            </div>
        </div>
    );
};
