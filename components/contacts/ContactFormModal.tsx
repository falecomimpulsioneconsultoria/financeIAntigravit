import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Contact, ContactLabel, PersonType } from '../../types';

const ALL_LABELS: ContactLabel[] = [
  'Cliente', 'Transportadora', 'Tecnico', 'Fornecedor',
  'Colaborador', 'Representada', 'Vendedor', 'Credenciadora', 'Fabricante',
];

const LABEL_DISPLAY: Record<ContactLabel, string> = {
  Cliente: 'Cliente',
  Transportadora: 'Transportadora',
  Tecnico: 'Técnico',
  Fornecedor: 'Fornecedor',
  Colaborador: 'Colaborador',
  Representada: 'Representada',
  Vendedor: 'Vendedor',
  Credenciadora: 'Credenciadora',
  Fabricante: 'Fabricante',
};

type ContactFormData = Omit<Contact, 'id' | 'userId' | 'createdAt'>;

const EMPTY_FORM: ContactFormData = {
  fantasyName: '',
  legalName: '',
  personType: 'FISICA',
  cpfCnpj: '',
  email: '',
  phone: '',
  whatsapp: '',
  mobile: '',
  labels: [],
  isActive: true,
};

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => Promise<{ duplicateField?: string }>;
  initialData?: Contact | null;
  prefillName?: string;
}

export function ContactFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  prefillName,
}: ContactFormModalProps) {
  const [form, setForm] = useState<ContactFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          fantasyName: initialData.fantasyName,
          legalName: initialData.legalName || '',
          personType: initialData.personType,
          cpfCnpj: initialData.cpfCnpj || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          whatsapp: initialData.whatsapp || '',
          mobile: initialData.mobile || '',
          labels: initialData.labels,
          isActive: initialData.isActive,
        });
      } else {
        setForm({ ...EMPTY_FORM, fantasyName: prefillName || '' });
      }
      setErrors({});
    }
  }, [isOpen, initialData, prefillName]);

  if (!isOpen) return null;

  const set = (field: keyof ContactFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const toggleLabel = (label: ContactLabel) => {
    setForm((prev) => ({
      ...prev,
      labels: prev.labels.includes(label)
        ? prev.labels.filter((l) => l !== label)
        : [...prev.labels, label],
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.fantasyName.trim()) errs.fantasyName = 'Nome Fantasia é obrigatório';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'E-mail inválido';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const result = await onSubmit(form);
      if (result.duplicateField) {
        setErrors({ _duplicate: `Já existe um cadastro com o mesmo ${result.duplicateField}.` });
      } else {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const documentLabel = form.personType === 'JURIDICA' ? 'CNPJ' : 'CPF';

    createPortal(
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {initialData ? 'Editar Contato' : 'Novo Contato'}
                </h2>
                <p className="text-xs text-gray-400">Pessoa / Fornecedor</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-5">

              {/* Duplicate error */}
              {errors._duplicate && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700">{errors._duplicate}</p>
                </div>
              )}

              {/* Row 1: Nome Fantasia + Tipo de Pessoa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Nome Fantasia <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.fantasyName}
                    onChange={(e) => set('fantasyName', e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${errors.fantasyName ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}
                    placeholder="Nome ou nome fantasia"
                  />
                  {errors.fantasyName && <p className="text-[11px] text-red-500 mt-1">{errors.fantasyName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Tipo de Pessoa
                  </label>
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                    {(['FISICA', 'JURIDICA'] as PersonType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => set('personType', type)}
                        className={`flex-1 py-2.5 text-sm font-medium transition-all ${form.personType === type ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                      >
                        {type === 'FISICA' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Razão Social + CPF/CNPJ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Razão Social
                  </label>
                  <input
                    type="text"
                    value={form.legalName || ''}
                    onChange={(e) => set('legalName', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder={form.personType === 'JURIDICA' ? 'Razão social' : 'Nome completo'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {documentLabel}
                  </label>
                  <input
                    type="text"
                    value={form.cpfCnpj || ''}
                    onChange={(e) => set('cpfCnpj', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder={form.personType === 'JURIDICA' ? '00.000.000/0000-00' : '000.000.000-00'}
                  />
                </div>
              </div>

              {/* Row 3: E-mail Geral */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  E-mail Geral
                </label>
                <input
                  type="email"
                  value={form.email || ''}
                  onChange={(e) => set('email', e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${errors.email ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}
                  placeholder="email@exemplo.com"
                />
                {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* Row 4: Telefone + Whatsapp + Celular */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Telefone</label>
                  <input
                    type="text"
                    value={form.phone || ''}
                    onChange={(e) => set('phone', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">WhatsApp</label>
                  <input
                    type="text"
                    value={form.whatsapp || ''}
                    onChange={(e) => set('whatsapp', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Celular</label>
                  <input
                    type="text"
                    value={form.mobile || ''}
                    onChange={(e) => set('mobile', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              {/* Toggle Inativo */}
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-700">Cadastro Inativo</p>
                  <p className="text-xs text-gray-400">Contatos inativos não aparecem nas sugestões</p>
                </div>
                <button
                  type="button"
                  onClick={() => set('isActive', !form.isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${!form.isActive ? 'bg-red-400' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${!form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Rótulos */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Rótulo — Relação com a empresa
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_LABELS.map((label) => {
                    const checked = form.labels.includes(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleLabel(label)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          checked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-white/20 border-white/50' : 'border-gray-300'}`}>
                          {checked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        {LABEL_DISPLAY[label]}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {saving && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {initialData ? 'Salvar Alterações' : 'Criar Contato'}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    )
}
