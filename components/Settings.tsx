
import React, { useState, useRef } from 'react';
import { DashboardConfig, User, SubUser, UserPermissions, PaymentMethod, Transaction } from '../types';
import { Button } from './ui/Button';
import { authService } from '../services/authService';

interface SettingsProps {
    config: DashboardConfig;
    onSave: (config: DashboardConfig) => void;
    user: User;
    onUpdateUser: (updatedUser: User) => void;
    onResetData?: (deleteCategories: boolean) => void;
    paymentMethods?: PaymentMethod[];
    onAddPaymentMethod?: (name: string) => void;
    onDeletePaymentMethod?: (id: string) => void;
    transactions?: Transaction[];
}

type TabType = 'PROFILE' | 'SECURITY' | 'USERS' | 'PAYMENT_METHODS' | 'PREFERENCES';

const DEFAULT_PERMISSIONS: UserPermissions = {
    viewDashboard: true,
    manageTransactions: false,
    manageAccounts: false,
    manageCategories: false,
    viewReports: true,
    viewSettings: false
};

export const Settings: React.FC<SettingsProps> = ({
    config, onSave, user, onUpdateUser, onResetData,
    paymentMethods = [], onAddPaymentMethod, onDeletePaymentMethod, transactions = []
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('PROFILE');
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Profile State
    const [name, setName] = useState(user.name.split(' (Acesso:')[0]);
    const [photoUrl, setPhotoUrl] = useState(user.photoUrl || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password State
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    // Sub-users State
    const [subUsers, setSubUsers] = useState<SubUser[]>(user.subUsers || []);
    const [editingSubUserId, setEditingSubUserId] = useState<string | null>(null);

    const [newSubUserName, setNewSubUserName] = useState('');
    const [newSubUserEmail, setNewSubUserEmail] = useState('');
    const [newSubUserPassword, setNewSubUserPassword] = useState('');
    const [newPermissions, setNewPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);

    // Payment Method State
    const [newPaymentMethodName, setNewPaymentMethodName] = useState('');

    // Reset Data Modal State
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetPasswordInput, setResetPasswordInput] = useState('');
    const [deleteCategories, setDeleteCategories] = useState(false);
    const [resetError, setResetError] = useState('');

    const isSubUserSession = user.name.includes('(Acesso:');
    const canManageUsers = !isSubUserSession;
    const canChangeSecurity = !isSubUserSession;
    const canViewPreferences = user.activePermissions?.viewSettings;

    const accountTypeName = user.accountType === 'BUSINESS' ? 'Conta Empresarial' : 'Conta Pessoal';
    const documentLabel = user.accountType === 'BUSINESS' ? 'CNPJ' : 'CPF';

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
            const displayName = isSubUserSession ? `${name} (Acesso: ...)` : name;
            onUpdateUser({ ...user, ...updates, name: displayName });
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

    const handleEditSubUser = (subUser: SubUser) => {
        setEditingSubUserId(subUser.id);
        setNewSubUserName(subUser.name);
        setNewSubUserEmail(subUser.email || '');
        setNewSubUserPassword('');
        setNewPermissions(subUser.permissions || DEFAULT_PERMISSIONS);
    };

    const handleCancelEdit = () => {
        setEditingSubUserId(null);
        setNewSubUserName('');
        setNewSubUserEmail('');
        setNewSubUserPassword('');
        setNewPermissions(DEFAULT_PERMISSIONS);
    };

    const handleSaveSubUser = async () => {
        if (!newSubUserName.trim()) return;
        let updatedList = [...subUsers];

        if (editingSubUserId) {
            updatedList = subUsers.map(u => {
                if (u.id === editingSubUserId) {
                    return {
                        ...u,
                        name: newSubUserName,
                        email: newSubUserEmail,
                        password: newSubUserPassword.trim() ? newSubUserPassword : u.password,
                        permissions: newPermissions
                    };
                }
                return u;
            });
        } else {
            const newUser: SubUser = {
                id: crypto.randomUUID(),
                name: newSubUserName,
                email: newSubUserEmail,
                password: newSubUserPassword,
                role: 'VIEWER',
                permissions: newPermissions
            };
            updatedList.push(newUser);
        }

        setSubUsers(updatedList);
        handleCancelEdit();
        await authService.updateUser(user.id, { subUsers: updatedList });
        onUpdateUser({ ...user, subUsers: updatedList });
    };

    const handleRemoveSubUser = async (id: string) => {
        if (window.confirm("Tem certeza que deseja remover este usuário?")) {
            const updatedList = subUsers.filter(u => u.id !== id);
            setSubUsers(updatedList);
            await authService.updateUser(user.id, { subUsers: updatedList });
            onUpdateUser({ ...user, subUsers: updatedList });
        }
    };

    const toggleNewPermission = (key: keyof UserPermissions) => {
        setNewPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleConfigChange = (key: keyof DashboardConfig) => {
        onSave({ ...config, [key]: !config[key] });
    };

    const handleAddNewPaymentMethod = () => {
        if (!newPaymentMethodName.trim() || !onAddPaymentMethod) return;
        onAddPaymentMethod(newPaymentMethodName);
        setNewPaymentMethodName('');
    };

    const handleDeleteMethodClick = (id: string) => {
        if (!onDeletePaymentMethod) return;
        if (transactions.some(t => t.paymentMethodId === id)) {
            alert("Existem lançamentos associados a esta forma de pagamento.");
            return;
        }
        if (window.confirm("Deseja excluir?")) onDeletePaymentMethod(id);
    };

    const handleOpenResetModal = () => {
        setResetPasswordInput('');
        setResetError('');
        setDeleteCategories(false);
        setIsResetModalOpen(true);
    };

    const handleConfirmReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetError('');
        const isValid = await authService.verifyPassword(user.id, resetPasswordInput);
        if (!isValid) {
            setResetError('Senha incorreta.');
            return;
        }
        if (onResetData) {
            onResetData(deleteCategories);
            setIsResetModalOpen(false);
        }
    };

    const TabButton = ({ id, label, icon }: { id: TabType, label: string, icon: React.ReactNode }) => (
        <button
            onClick={() => { setActiveTab(id); setSuccessMsg(''); setErrorMsg(''); handleCancelEdit(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === id ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-gray-600 hover:bg-gray-50'
                }`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="w-full space-y-6 animate-fade-in pb-10">
            <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
                        <TabButton id="PROFILE" label="Perfil" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
                        {canChangeSecurity && <TabButton id="SECURITY" label="Segurança" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>} />}
                        {canManageUsers && <TabButton id="USERS" label="Equipe" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />}
                        <TabButton id="PAYMENT_METHODS" label="Formas de Pagto" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>} />
                        {canViewPreferences && <TabButton id="PREFERENCES" label="Preferências" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>} />}
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                    {successMsg && <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl border border-green-100">{successMsg}</div>}
                    {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">{errorMsg}</div>}

                    {activeTab === 'PROFILE' && (
                        <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-lg animate-fade-in">
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow bg-gray-100 flex items-center justify-center">
                                        {photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl font-bold text-gray-300">{name.charAt(0).toUpperCase()}</span>}
                                    </div>
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow hover:bg-blue-700"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg></button>
                                    <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                                </div>
                                <div><h4 className="text-lg font-bold">Identificação</h4><p className="text-sm text-gray-500">Logo ou foto pessoal.</p></div>
                            </div>

                            {/* STATUS DA CONTA */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Status da Conta</p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-1 rounded-lg ${user.accountType === 'BUSINESS' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {user.accountType === 'BUSINESS' ? (
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                        ) : (
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        )}
                                        {accountTypeName}
                                    </span>
                                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-1 rounded-lg ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                                        {user.isActive ? 'Conta Ativa' : 'Conta Inativa'}
                                    </span>
                                </div>
                                {user.document && (
                                    <p className="text-xs text-gray-500 mt-2">{documentLabel}: <span className="font-semibold text-gray-700">{user.document}</span></p>
                                )}
                            </div>

                            <div><label className="block text-sm font-medium mb-1">Nome</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500" /></div>
                            <div className="flex justify-end pt-4"><Button type="submit" isLoading={isLoading}>Salvar</Button></div>
                        </form>
                    )}

                    {activeTab === 'SECURITY' && (
                        <form onSubmit={handleChangePassword} className="space-y-5 max-w-lg animate-fade-in">
                            <div><label className="block text-sm font-medium mb-1">Senha Atual</label><input type="password" required value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border rounded-xl" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium mb-1">Nova Senha</label><input type="password" required value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border rounded-xl" /></div>
                                <div><label className="block text-sm font-medium mb-1">Confirmar</label><input type="password" required value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border rounded-xl" /></div>
                            </div>
                            <div className="flex justify-end pt-4"><Button type="submit" isLoading={isLoading}>Alterar Senha</Button></div>
                        </form>
                    )}

                    {activeTab === 'USERS' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="space-y-4">
                                {subUsers.map(u => (
                                    <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border rounded-xl shadow-sm gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0 uppercase">{u.name.charAt(0)}</div>
                                            <div>
                                                <p className="font-bold text-gray-900">{u.name}</p>
                                                <p className="text-xs text-gray-400">{u.email}</p>
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {Object.values(u.permissions || {}).every(v => v) ? (
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] uppercase font-bold tracking-wide rounded-md">Acesso Total</span>
                                                    ) : Object.values(u.permissions || {}).every(v => !v) ? (
                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] uppercase font-bold tracking-wide rounded-md">Sem Acesso</span>
                                                    ) : (
                                                        <>
                                                            {u.permissions?.viewDashboard && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded border border-blue-100">Dash</span>}
                                                            {u.permissions?.manageTransactions && <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-medium rounded border border-indigo-100">Lançamentos</span>}
                                                            {u.permissions?.manageAccounts && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-medium rounded border border-purple-100">Contas</span>}
                                                            {u.permissions?.viewReports && <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-medium rounded border border-orange-100">Relatórios</span>}
                                                            {u.permissions?.viewSettings && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded border border-gray-200">Config</span>}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 self-end sm:self-center">
                                            <button onClick={() => handleEditSubUser(u)} className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" strokeWidth={2} /></svg></button>
                                            <button onClick={() => handleRemoveSubUser(u.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" strokeWidth={2} /></svg></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 bg-gray-50 rounded-xl border space-y-4">
                                <h5 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">{editingSubUserId ? 'Editar Usuário' : 'Novo Usuário'}</h5>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Nome</label>
                                            <input
                                                placeholder="Ex: João Silva"
                                                value={newSubUserName}
                                                onChange={e => setNewSubUserName(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                                            <input
                                                placeholder="joao@empresa.com"
                                                value={newSubUserEmail}
                                                onChange={e => setNewSubUserEmail(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Senha {editingSubUserId && '(Deixe em branco para manter)'}</label>
                                            <input
                                                type="password"
                                                placeholder="********"
                                                value={newSubUserPassword}
                                                onChange={e => setNewSubUserPassword(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                                        <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Permissões de Acesso</label>
                                        <div className="space-y-3">
                                            {[
                                                { key: 'viewDashboard', label: 'Visualizar Dashboard' },
                                                { key: 'manageTransactions', label: 'Gerenciar Lançamentos' },
                                                { key: 'manageAccounts', label: 'Gerenciar Contas' },
                                                { key: 'manageCategories', label: 'Gerenciar Categorias' },
                                                { key: 'viewReports', label: 'Visualizar Relatórios' },
                                                { key: 'viewSettings', label: 'Acessar Configurações' }
                                            ].map((perm) => (
                                                <label key={perm.key} className="flex items-center gap-3 cursor-pointer group">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={newPermissions[perm.key as keyof UserPermissions]}
                                                            onChange={() => toggleNewPermission(perm.key as keyof UserPermissions)}
                                                            className="peer sr-only"
                                                        />
                                                        <div className="w-5 h-5 bg-gray-100 border-2 border-gray-300 rounded transition-all peer-checked:bg-blue-500 peer-checked:border-blue-500"></div>
                                                        <svg className="w-3 h-3 text-white absolute top-1 left-1 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors select-none">{perm.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                    {editingSubUserId && (
                                        <Button variant="ghost" onClick={handleCancelEdit}>Cancelar Edição</Button>
                                    )}
                                    <Button onClick={handleSaveSubUser}>
                                        {editingSubUserId ? 'Salvar Alterações' : 'Adicionar Usuário'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'PAYMENT_METHODS' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex gap-3"><input value={newPaymentMethodName} onChange={e => setNewPaymentMethodName(e.target.value)} placeholder="Nova forma (Ex: VR)" className="flex-1 px-4 py-2 border rounded-lg" /><Button onClick={handleAddNewPaymentMethod}>Adicionar</Button></div>
                            <div className="space-y-2">{paymentMethods.map(m => (<div key={m.id} className="flex justify-between p-3 bg-white border rounded-lg"><span>{m.name}</span><button onClick={() => handleDeleteMethodClick(m.id)} className="text-red-400 hover:text-red-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" strokeWidth={2} /></svg></button></div>))}</div>
                        </div>
                    )}

                    {activeTab === 'PREFERENCES' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="space-y-3">
                                <div className="flex justify-between p-4 bg-gray-50 rounded-xl border items-center">
                                    <span className="font-medium text-gray-700">Moeda Principal</span>
                                    <select
                                        value={config.currency || 'BRL'}
                                        onChange={e => onSave({ ...config, currency: e.target.value })}
                                        className="bg-white border text-sm font-bold rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="BRL">Real (R$)</option>
                                        <option value="USD">Dólar ($)</option>
                                        <option value="EUR">Euro (€)</option>
                                    </select>
                                </div>

                                {['showBalanceCard', 'showIncomeCard', 'showExpenseCard', 'showPendingCard', 'showAIAnalysis', 'showCharts'].map(k => (
                                    <div key={k} className="flex justify-between p-4 bg-gray-50 rounded-xl border">
                                        <span className="capitalize">{k.replace('show', 'Exibir ').replace('Card', '')}</span>
                                        <input type="checkbox" checked={(config as any)[k]} onChange={() => handleConfigChange(k as any)} className="w-5 h-5 text-blue-600" />
                                    </div>
                                ))}
                            </div>

                            {onResetData && !isSubUserSession && (
                                <div className="mt-8 pt-8 border-t border-red-100">
                                    <h3 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h3>
                                    <Button variant="danger" onClick={handleOpenResetModal} className="w-full sm:w-auto bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white transition-all">
                                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Zerar Todos os Dados
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {isResetModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-scale-in">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Zerar Sistema</h3>
                        <p className="text-sm text-gray-500 mb-6 text-center">Apaga lançamentos e contas. Ação irreversível.</p>
                        <form onSubmit={handleConfirmReset} className="space-y-4">
                            <input type="password" required value={resetPasswordInput} onChange={e => setResetPasswordInput(e.target.value)} placeholder="Sua senha master" className="w-full p-4 bg-gray-50 border rounded-2xl text-center focus:ring-4 focus:ring-red-500/10" />
                            {resetError && <p className="text-xs text-red-600 text-center">{resetError}</p>}
                            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                                <input type="checkbox" id="delCat" checked={deleteCategories} onChange={e => setDeleteCategories(e.target.checked)} className="w-5 h-5 text-red-600" />
                                <label htmlFor="delCat" className="text-xs text-red-800 font-bold">Apagar Categorias também?</label>
                            </div>
                            <div className="flex gap-3 pt-4"><Button type="button" variant="ghost" onClick={() => setIsResetModalOpen(false)} className="flex-1">Cancelar</Button><Button type="submit" variant="danger" className="flex-1">Zerar Agora</Button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
