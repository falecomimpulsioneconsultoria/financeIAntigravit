import React from 'react';
import { User } from '../../types';

interface ImpersonationBannerProps {
  user: User;
  admin: User;
  onExit: () => void;
}

export const ImpersonationBanner: React.FC<ImpersonationBannerProps> = ({ user, admin, onExit }) => {
  return (
    <div className="bg-slate-950 border-b-2 border-amber-500 text-white px-4 py-2.5 shadow-lg relative z-40 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </span>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Acesso Administrativo (Suporte)
          </span>
          <span className="text-xs text-slate-300 hidden sm:inline">
            Navegando na conta de:
          </span>
          <span className="text-xs font-semibold text-white bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
            {user.name} <span className="text-slate-400 font-normal">({user.email})</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <span className="text-xs text-slate-400 hidden md:inline">
          Admin: <strong className="text-slate-200">{admin.name}</strong>
        </span>
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-sm active:scale-95"
          title="Encerrar visualização e retornar ao Painel de Administrador"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair do Modo Suporte
        </button>
      </div>
    </div>
  );
};
