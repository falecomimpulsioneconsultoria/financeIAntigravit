
import React, { useState, useRef } from 'react';
import { User, SubUser, UserPermissions } from '../types';
import { Button } from './ui/Button';
import { authService } from '../services/authService';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
}

type TabType = 'PROFILE' | 'SECURITY' | 'USERS';

const DEFAULT_PERMISSIONS: UserPermissions = {
  viewDashboard: true,
  manageTransactions: false,
  manageAccounts: false,
  manageCategories: false,
  viewReports: true,
  viewSettings: false
};

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('PROFILE');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Profile State
  const [name, setName] = useState(user.name);
  const [email] = useState(user.email); // Email is read-only usually
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Sub-users State
  const [subUsers, setSubUsers] = useState<SubUser[]>(user.subUsers || []);
  const [newSubUserName, setNewSubUserName] = useState('');
  const [newSubUserEmail, setNewSubUserEmail] = useState('');
  const [newSubUserPassword, setNewSubUserPassword] = useState('');
  const [newPermissions, setNewPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);

  // --- HANDLERS ---

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const updates = { name, photoUrl };
      await authService.updateUser(user.id, updates);
      onUpdate({ ...user, ...updates });
      setSuccessMsg('Perfil atualizado com sucesso!');
    } catch (error) {
      setErrorMsg('Erro ao atualizar perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
        setErrorMsg('As novas senhas não coincidem.');
        return;
    }
    if (newPass.length < 6) {
        setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
        return;
    }

    setIsLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
        await authService.changePassword(user.id, currentPass, newPass);
        setSuccessMsg('Senha alterada com sucesso!');
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
    } catch (error: any) {
        setErrorMsg(error.message || 'Erro ao alterar senha.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleAddSubUser = async () => {
    if (!newSubUserName.trim()) return;
    if (!newSubUserEmail.trim() || !newSubUserPassword.trim()) {
        setErrorMsg("Email e senha são obrigatórios para usuários adicionais.");
        return;
    }
    
    const newUser: SubUser = {
        id: crypto.randomUUID(),
        name: newSubUserName,
        email: newSubUserEmail,
        password: newSubUserPassword,
        role: 'VIEWER',
        permissions: newPermissions
    };

    const updatedList = [...subUsers, newUser];
    setSubUsers(updatedList);
    setNewSubUserName('');
    setNewSubUserEmail('');
    setNewSubUserPassword('');
    setNewPermissions(DEFAULT_PERMISSIONS);
    setErrorMsg('');

    // Persist immediately
    await authService.updateUser(user.id, { subUsers: updatedList });
    onUpdate({ ...user, subUsers: updatedList });
  };

  const handleRemoveSubUser = async (id: string) => {
      const updatedList = subUsers.filter(u => u.id !== id);
      setSubUsers(updatedList);
      await authService.updateUser(user.id, { subUsers: updatedList });
      onUpdate({ ...user, subUsers: updatedList });
  };

  const toggleNewPermission = (key: keyof UserPermissions) => {
      setNewPermissions(prev => ({
          ...prev,
          [key]: !prev[key]
      }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-900 text-lg">Configurações da Conta</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-200 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-full md:w-64 bg-gray-50 p-4 border-r border-gray-100 flex flex-row md:flex-col gap-2 overflow-x-auto">
                <button 
                    onClick={() => { setActiveTab('PROFILE'); setSuccessMsg(''); setErrorMsg(''); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'PROFILE' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100' : 'text-gray-600 hover:bg-white/50'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    Meu Perfil
                </button>
                <button 
                    onClick={() => { setActiveTab('SECURITY'); setSuccessMsg(''); setErrorMsg(''); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'SECURITY' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100' : 'text-gray-600 hover:bg-white/50'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Segurança
                </button>
                <button 
                    onClick={() => { setActiveTab('USERS'); setSuccessMsg(''); setErrorMsg(''); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'USERS' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100' : 'text-gray-600 hover:bg-white/50'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    Usuários
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                
                {successMsg && (
                    <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center text-sm font-medium animate-fade-in">
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {successMsg}
                    </div>
                )}
                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center text-sm font-medium animate-fade-in">
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {errorMsg}
                    </div>
                )}

                {/* --- TAB: PROFILE --- */}
                {activeTab === 'PROFILE' && (
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="flex items-center gap-6">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-100 flex items-center justify-center">
                                    {photoUrl ? (
                                        <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-bold text-gray-300">{name.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-sm hover:bg-blue-700 transition-transform hover:scale-110"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900">Sua Foto</h4>
                                <p className="text-sm text-gray-500">Isso será exibido no seu perfil.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                            <input 
                                type="email" 
                                value={email}
                                disabled
                                className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                            />
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <Button type="submit" isLoading={isLoading} className="shadow-lg shadow-blue-500/20">Salvar Alterações</Button>
                        </div>
                    </form>
                )}

                {/* --- TAB: SECURITY --- */}
                {activeTab === 'SECURITY' && (
                    <form onSubmit={handleChangePassword} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
                            <input 
                                type="password" 
                                required
                                value={currentPass}
                                onChange={(e) => setCurrentPass(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                                <input 
                                    type="password" 
                                    required
                                    minLength={6}
                                    value={newPass}
                                    onChange={(e) => setNewPass(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                                <input 
                                    type="password" 
                                    required
                                    minLength={6}
                                    value={confirmPass}
                                    onChange={(e) => setConfirmPass(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <Button type="submit" isLoading={isLoading} className="bg-gray-800 hover:bg-gray-900 text-white shadow-lg">Atualizar Senha</Button>
                        </div>
                    </form>
                )}

                {/* --- TAB: USERS --- */}
                {activeTab === 'USERS' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h4 className="font-bold text-blue-900 mb-1">Membros da Família / Equipe</h4>
                            <p className="text-sm text-blue-700">Adicione pessoas que podem acessar esta conta com login próprio.</p>
                        </div>

                        <div className="space-y-3">
                            {subUsers.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">Nenhum usuário adicional.</p>}
                            {subUsers.map(u => (
                                <div key={u.id} className="flex flex-col p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 text-sm">{u.name}</p>
                                                {u.email && <p className="text-xs text-gray-400">{u.email}</p>}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveSubUser(u.id)}
                                            className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remover"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {u.permissions?.manageTransactions && <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">Lançamentos</span>}
                                        {u.permissions?.manageAccounts && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">Contas</span>}
                                        {u.permissions?.viewReports && <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">Relatórios</span>}
                                        {!u.permissions?.manageTransactions && !u.permissions?.manageAccounts && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Visualizador</span>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <h5 className="text-sm font-bold text-gray-700 mb-3">Adicionar Novo</h5>
                            <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input 
                                        type="text"
                                        placeholder="Nome (Ex: Conjuge, Sócio)"
                                        value={newSubUserName}
                                        onChange={(e) => setNewSubUserName(e.target.value)}
                                        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    <input 
                                        type="email"
                                        placeholder="E-mail de Login"
                                        value={newSubUserEmail}
                                        onChange={(e) => setNewSubUserEmail(e.target.value)}
                                        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                                <input 
                                    type="password"
                                    placeholder="Senha de Acesso"
                                    value={newSubUserPassword}
                                    onChange={(e) => setNewSubUserPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                                
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Permissões de Acesso</p>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={newPermissions.viewDashboard} onChange={() => toggleNewPermission('viewDashboard')} className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span>Ver Dashboard</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={newPermissions.manageTransactions} onChange={() => toggleNewPermission('manageTransactions')} className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span>Gerenciar Lançamentos</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={newPermissions.manageAccounts} onChange={() => toggleNewPermission('manageAccounts')} className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span>Gerenciar Contas</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={newPermissions.manageCategories} onChange={() => toggleNewPermission('manageCategories')} className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span>Gerenciar Categorias</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={newPermissions.viewReports} onChange={() => toggleNewPermission('viewReports')} className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span>Acessar Relatórios</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={newPermissions.viewSettings} onChange={() => toggleNewPermission('viewSettings')} className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span>Acessar Configurações</span>
                                        </label>
                                    </div>
                                </div>

                                <Button onClick={handleAddSubUser} disabled={!newSubUserName.trim() || !newSubUserEmail.trim() || !newSubUserPassword.trim()} variant="secondary">Adicionar Usuário</Button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
      </div>
    </div>
  );
};
