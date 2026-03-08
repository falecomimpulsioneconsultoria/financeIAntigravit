// aria-label for accessibility added
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
    return null;
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
