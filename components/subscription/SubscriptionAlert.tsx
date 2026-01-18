import React from 'react';
import { User, PaymentStatus } from '../../types';
import { Button } from '../ui/Button';

interface SubscriptionAlertProps {
  user: User;
}

export const SubscriptionAlert: React.FC<SubscriptionAlertProps> = ({ user }) => {
  const now = new Date();
  const expDate = new Date(user.expirationDate);
  const diffTime = expDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isOverdue = user.paymentStatus === 'OVERDUE' || diffTime < 0;
  const isExpiringSoon = diffDays <= 5 && diffDays >= 0 && user.role === 'USER';

  if (isOverdue && user.role === 'USER') {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Acesso Suspenso</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Sua assinatura expirou em <strong>{expDate.toLocaleDateString('pt-BR')}</strong>. 
            Regularize seu plano para continuar gerenciando suas finanças com inteligência.
          </p>
          <div className="space-y-3">
            <Button className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200" onClick={() => window.open('https://api.whatsapp.com/send?phone=YOUR_SUPPORT_NUMBER', '_blank')}>
              Renovar Agora
            </Button>
            <p className="text-[10px] text-slate-400">Dúvidas? Entre em contato com nosso suporte.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isExpiringSoon) {
    return (
      <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 flex items-center justify-between animate-in slide-in-from-top duration-500">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900">Assinatura próximo do vencimento</p>
            <p className="text-xs text-amber-700">Sua assinatura vence em {diffDays === 0 ? 'hoje' : `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`}. Regularize para não perder o acesso.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="bg-white border-amber-200 text-amber-700 hover:bg-amber-100 shrink-0 ml-4 font-bold" onClick={() => window.open('https://api.whatsapp.com/send?phone=YOUR_SUPPORT_NUMBER', '_blank')}>
          Regularizar
        </Button>
      </div>
    );
  }

  return null;
};
