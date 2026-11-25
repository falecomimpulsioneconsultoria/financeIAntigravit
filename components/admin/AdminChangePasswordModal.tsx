import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../types';
import { authService } from '../../services/authService';
import { Button } from '../ui/Button';

interface AdminChangePasswordModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (user: User) => void;
}

interface PasswordStrength {
    score: number; // 0 to 4
    label: string;
    barColor: string;
    textColor: string;
    checks: {
        minLength: boolean;
        hasCaseMix: boolean;
        hasNumber: boolean;
        hasSpecial: boolean;
    };
}

const evaluatePasswordStrength = (password: string): PasswordStrength => {
    const checks = {
        minLength: password.length >= 6,
        hasCaseMix: /[a-z]/.test(password) && /[A-Z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecial: /[^A-Za-z0-9]/.test(password)
    };

    if (!password) {
        return {
            score: 0,
            label: 'Digite uma senha',
            barColor: 'bg-gray-200',
            textColor: 'text-gray-400',
            checks
        };
    }

    let score = 0;
    if (checks.minLength) score += 1;
    if (password.length >= 10 || checks.hasCaseMix) score += 1;
    if (checks.hasNumber) score += 1;
    if (checks.hasSpecial) score += 1;

    if (!checks.minLength) {
        return {
            score: 1,
            label: 'Muito curta (mín. 6 caracteres)',
            barColor: 'bg-red-500',
            textColor: 'text-red-600',
            checks
        };
    }

    if (score <= 1) {
        return { score: 1, label: 'Fraca', barColor: 'bg-red-500', textColor: 'text-red-600', checks };
    }
    if (score === 2) {
        return { score: 2, label: 'Razoável', barColor: 'bg-amber-500', textColor: 'text-amber-600', checks };
    }
    if (score === 3) {
        return { score: 3, label: 'Boa', barColor: 'bg-blue-500', textColor: 'text-blue-600', checks };
    }
    return { score: 4, label: 'Forte', barColor: 'bg-emerald-500', textColor: 'text-emerald-600', checks };
};

export const AdminChangePasswordModal: React.FC<AdminChangePasswordModalProps> = ({
    user,
    isOpen,
    onClose,
    onSuccess
}) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setNewPassword('');
            setConfirmPassword('');
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            setErrorMessage(null);
            setSuccessMessage(null);
        }
    }, [isOpen, user?.id]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSubmitting) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    const strength = useMemo(() => evaluatePasswordStrength(newPassword), [newPassword]);
    const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
    const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
    const canSubmit = newPassword.length >= 6 && newPassword === confirmPassword && !isSubmitting;

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);

        if (newPassword.length < 6) {
            setErrorMessage('A nova senha deve conter pelo menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMessage('As senhas informadas não coincidem.');
            return;
        }

        setIsSubmitting(true);
        try {
            await authService.adminChangeUserPassword(user.id, newPassword);
            setSuccessMessage('Senha alterada com sucesso!');
            if (onSuccess) {
                onSuccess(user);
            }
            setTimeout(() => {
                onClose();
            }, 900);
        } catch (err: any) {
            console.error('Erro ao alterar senha do usuário:', err);
            setErrorMessage(err?.message || 'Não foi possível alterar a senha do usuário.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const EyeIcon = ({ visible }: { visible: boolean }) =>
        visible ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
        ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
        );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
            onClick={() => !isSubmitting && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-change-password-title"
        >
            <div
                className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-slate-900 text-white px-6 py-5 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <h3 id="admin-change-password-title" className="text-base font-bold leading-tight">
                                Alterar Senha do Usuário
                            </h3>
                            <p className="text-xs text-slate-300 truncate mt-0.5">
                                {user.name} • {user.email}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="Fechar modal"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {errorMessage && (
                        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5">
                            <svg className="w-4 h-4 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2.5">
                            <svg className="w-4 h-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* Nova Senha */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Nova Senha
                        </label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                placeholder="Digite a nova senha"
                                autoComplete="new-password"
                                disabled={isSubmitting}
                                required
                                className="w-full px-4 py-3 pr-11 bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200 focus:border-blue-500 rounded-xl text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword((prev) => !prev)}
                                aria-label={showNewPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 transition-colors"
                            >
                                <EyeIcon visible={showNewPassword} />
                            </button>
                        </div>

                        {/* Indicador de Força */}
                        <div className="mt-2.5 space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-400 font-medium">Força da senha</span>
                                <span className={`font-bold ${strength.textColor}`}>{strength.label}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                                {[1, 2, 3, 4].map((level) => (
                                    <div
                                        key={level}
                                        className={`h-1.5 rounded-full transition-all duration-200 ${
                                            strength.score >= level ? strength.barColor : 'bg-gray-200'
                                        }`}
                                    />
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                                <span className={strength.checks.minLength ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                                    {strength.checks.minLength ? '✓' : '○'} Mínimo 6 caracteres
                                </span>
                                <span className={strength.checks.hasCaseMix ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                                    {strength.checks.hasCaseMix ? '✓' : '○'} Maiúsculas e minúsculas
                                </span>
                                <span className={strength.checks.hasNumber ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                                    {strength.checks.hasNumber ? '✓' : '○'} Contém número
                                </span>
                                <span className={strength.checks.hasSpecial ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                                    {strength.checks.hasSpecial ? '✓' : '○'} Caractere especial
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Confirmar Nova Senha */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Confirmar Nova Senha
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                placeholder="Repita a nova senha"
                                autoComplete="new-password"
                                disabled={isSubmitting}
                                required
                                className={`w-full px-4 py-3 pr-11 bg-gray-50 hover:bg-gray-100 focus:bg-white border rounded-xl text-sm font-medium text-gray-900 outline-none focus:ring-2 transition-all ${
                                    passwordsMismatch
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                                        : passwordsMatch
                                        ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20'
                                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20'
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 transition-colors"
                            >
                                <EyeIcon visible={showConfirmPassword} />
                            </button>
                        </div>
                        {passwordsMismatch && (
                            <p className="mt-1.5 text-[11px] font-medium text-red-600">
                                As senhas não coincidem.
                            </p>
                        )}
                        {passwordsMatch && (
                            <p className="mt-1.5 text-[11px] font-medium text-emerald-600">
                                Senhas conferem.
                            </p>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isSubmitting}
                            disabled={!canSubmit}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase"
                        >
                            Salvar Nova Senha
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
