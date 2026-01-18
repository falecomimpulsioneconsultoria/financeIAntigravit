import React from 'react';
import { User } from '../../types';

interface SuspensionBannerProps {
    user: User;
}

export const SuspensionBanner: React.FC<SuspensionBannerProps> = ({ user }) => {
    // Calcular dias para vencimento
    const now = new Date();
    const expiration = new Date(user.expirationDate);
    const diffTime = expiration.getTime() - now.getTime();
    const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Regra D-5: Aviso prévio
    const showWarning = daysUntilExpiration <= 5 && daysUntilExpiration >= 0 && user.paymentStatus === 'PAID';
    
    // Regra D=0 ou Atrasado: Alerta vermelho
    const isOverdue = user.paymentStatus === 'OVERDUE' || (daysUntilExpiration < 0 && user.paymentStatus !== 'SUSPENDED');

    // Regra D+3: Suspenso (Já coberto pelo PaymentWall, mas pode ter um banner também se não for bloqueante total)
    const isSuspended = user.paymentStatus === 'SUSPENDED';

    if (isSuspended) return null; // Será tratado pelo PaymentWall

    if (showWarning) {
        return (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 shadow-sm rounded-r-lg animate-fade-in-down">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-amber-700">
                            <span className="font-bold">Atenção:</span> Sua licença vence em <span className="font-bold">{daysUntilExpiration} dias</span>. 
                            <a href="#" className="font-bold underline ml-1 hover:text-amber-800">Regularize agora</a> para evitar bloqueios.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (isOverdue) {
        return (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 shadow-sm rounded-r-lg animate-pulse">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-red-700">
                            <span className="font-bold">Pagamento Pendente:</span> Sua fatura está atrasada. 
                            Regularize imediatamente para evitar a <span className="font-bold">suspensão do acesso</span>.
                            <button className="ml-2 bg-red-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-700 transition-colors">
                                PAGAR AGORA
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
