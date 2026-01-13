
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { User, AccountType } from '../types';
import { Button } from './ui/Button';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const AuthScreen: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('PERSONAL');
  const [document, setDocument] = useState('');
  
  // UI State
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Document Masks
  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-numeric
    
    if (accountType === 'PERSONAL') {
        // CPF Mask: 000.000.000-00
        if (value.length > 11) value = value.slice(0, 11);
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        // CNPJ Mask: 00.000.000/0000-00
        if (value.length > 14) value = value.slice(0, 14);
        value = value.replace(/^(\d{2})(\d)/, '$1.$2');
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
    }
    setDocument(value);
  };

  const handleAccountTypeChange = (type: AccountType) => {
      setAccountType(type);
      setDocument(''); // Clear document when switching types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let user;
      if (isLogin) {
        user = await authService.login(email, password);
      } else {
        if (!name) throw new Error(accountType === 'PERSONAL' ? "Nome completo é obrigatório" : "Nome da empresa é obrigatório");
        if (!document) throw new Error(accountType === 'PERSONAL' ? "CPF é obrigatório" : "CNPJ é obrigatório");
        
        // Simple Validation Length Check
        const cleanDoc = document.replace(/\D/g, '');
        if (accountType === 'PERSONAL' && cleanDoc.length !== 11) throw new Error("CPF inválido (11 dígitos).");
        if (accountType === 'BUSINESS' && cleanDoc.length !== 14) throw new Error("CNPJ inválido (14 dígitos).");

        user = await authService.register(name, email, password, accountType, document);
      }
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-scale-in">
        <div className="bg-blue-600 p-8 text-center">
           <div className="inline-flex bg-white/20 p-3 rounded-xl mb-4">
             <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
           </div>
           <h1 className="text-2xl font-bold text-white mb-2">Finances AI</h1>
           <p className="text-blue-100 text-sm">Controle financeiro inteligente</p>
        </div>

        <div className="p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
                {isLogin ? 'Acesse sua conta' : 'Crie sua conta grátis'}
            </h2>

            {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 flex items-center animate-fade-in">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                {error}
                </div>
            )}

            <form key={isLogin ? 'login' : 'register'} onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
                {!isLogin && (
                    <div className="animate-fade-in">
                        {/* Account Type Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                            <button
                                type="button"
                                onClick={() => handleAccountTypeChange('PERSONAL')}
                                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                                    accountType === 'PERSONAL' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Pessoa Física
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAccountTypeChange('BUSINESS')}
                                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                                    accountType === 'BUSINESS' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Empresa
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {accountType === 'PERSONAL' ? 'Nome Completo' : 'Nome da Empresa'}
                            </label>
                            <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={accountType === 'PERSONAL' ? "Seu nome" : "Razão Social / Nome Fantasia"}
                            />
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {accountType === 'PERSONAL' ? 'CPF' : 'CNPJ'}
                            </label>
                            <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={document}
                            onChange={handleDocumentChange}
                            placeholder={accountType === 'PERSONAL' ? "000.000.000-00" : "00.000.000/0000-00"}
                            />
                        </div>
                    </div>
                )}

                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                    type="email"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input
                    type="password"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    minLength={6}
                />
                </div>

                <Button 
                type="submit" 
                className="w-full mt-4" 
                size="lg"
                isLoading={isLoading}
                >
                {isLogin ? 'Entrar' : 'Cadastrar'}
                </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
                {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                <button 
                onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setEmail('');
                    setPassword('');
                    setName('');
                    setDocument('');
                    setAccountType('PERSONAL');
                }}
                className="ml-1 text-blue-600 font-semibold hover:underline focus:outline-none transition-colors hover:text-blue-800"
                >
                {isLogin ? 'Cadastre-se' : 'Fazer login'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
