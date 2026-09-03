import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Contact, ContactLabel } from '../../types';
import { ContactFormModal } from './ContactFormModal';

const LABEL_DISPLAY: Record<string, string> = {
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

const LABEL_COLORS: Record<string, string> = {
  Cliente: 'bg-blue-100 text-blue-700',
  Fornecedor: 'bg-amber-100 text-amber-700',
  Colaborador: 'bg-green-100 text-green-700',
  Tecnico: 'bg-emerald-100 text-emerald-700',
  Vendedor: 'bg-cyan-100 text-cyan-700',
  Transportadora: 'bg-orange-100 text-orange-700',
  Representada: 'bg-pink-100 text-pink-700',
  Credenciadora: 'bg-indigo-100 text-indigo-700',
  Fabricante: 'bg-teal-100 text-teal-700',
};

type ContactFormData = Omit<Contact, 'id' | 'userId' | 'createdAt'>;

interface ContactManagerProps {
  contacts: Contact[];
  onAdd: (data: ContactFormData) => Promise<{ duplicateField?: string }>;
  onEdit: (id: string, data: ContactFormData) => Promise<{ duplicateField?: string }>;
  onDelete: (id: string) => void;
}

export function ContactManager({ contacts, onAdd, onEdit, onDelete }: ContactManagerProps) {
  const [search, setSearch] = useState('');
  const [filterLabel, setFilterLabel] = useState<ContactLabel | ''>('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.fantasyName.toLowerCase().includes(q) ||
        (c.legalName || '').toLowerCase().includes(q) ||
        (c.cpfCnpj || '').includes(q) ||
        (c.email || '').toLowerCase().includes(q);

      const matchLabel = !filterLabel || c.labels.includes(filterLabel);

      const matchActive =
        filterActive === 'all' ||
        (filterActive === 'active' && c.isActive) ||
        (filterActive === 'inactive' && !c.isActive);

      return matchSearch && matchLabel && matchActive;
    });
  }, [contacts, search, filterLabel, filterActive]);

  const handleSubmit = async (data: ContactFormData) => {
    if (editingContact) {
      return onEdit(editingContact.id, data);
    }
    return onAdd(data);
  };

  const openNew = () => {
    setEditingContact(null);
    setIsFormOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingContact(null);
  };

  const handleFormSubmit = async (data: ContactFormData) => {
    const result = await handleSubmit(data);
    if (!result.duplicateField) {
      setIsFormOpen(false);
      setEditingContact(null);
    }
    return result;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contatos</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {contacts.length} cadastro{contacts.length !== 1 ? 's' : ''} no total
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Novo Contato
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF/CNPJ, e-mail..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Label filter */}
        <select
          value={filterLabel}
          onChange={(e) => setFilterLabel(e.target.value as ContactLabel | '')}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
        >
          <option value="">Todos os rótulos</option>
          {Object.entries(LABEL_DISPLAY).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        {/* Active filter */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          {([['active', 'Ativos'], ['all', 'Todos'], ['inactive', 'Inativos']] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setFilterActive(val)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${filterActive === val ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">Nenhum contato encontrado</p>
            <p className="text-sm text-gray-400 mt-1">Ajuste os filtros ou crie um novo contato</p>
            <button
              type="button"
              onClick={openNew}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Novo Contato
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Nome</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Tipo</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">CPF/CNPJ</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">E-mail</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Telefone</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Rótulos</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {contact.fantasyName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{contact.fantasyName}</p>
                          {contact.legalName && (
                            <p className="text-xs text-gray-400 truncate">{contact.legalName}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${contact.personType === 'JURIDICA' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {contact.personType === 'JURIDICA' ? 'Jurídica' : 'Física'}
                      </span>
                    </td>

                    {/* CPF/CNPJ */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 font-mono">{contact.cpfCnpj || '—'}</span>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 truncate max-w-[160px] block">{contact.email || '—'}</span>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{contact.phone || contact.mobile || '—'}</span>
                    </td>

                    {/* Labels */}
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.labels.slice(0, 3).map((label) => (
                          <span key={label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${LABEL_COLORS[label] || 'bg-gray-100 text-gray-600'}`}>
                            {LABEL_DISPLAY[label] || label}
                          </span>
                        ))}
                        {contact.labels.length > 3 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            +{contact.labels.length - 3}
                          </span>
                        )}
                        {contact.labels.length === 0 && <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${contact.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${contact.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {contact.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEdit(contact)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(contact.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Exibindo {filtered.length} de {contacts.length} contato{contacts.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        initialData={editingContact}
      />

      {/* Delete Confirmation */}
      {confirmDeleteId && createPortal(
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Excluir Contato</h3>
                <p className="text-xs text-gray-400">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Os lançamentos vinculados a este contato <strong>não serão excluídos</strong>, apenas a referência ao contato será removida.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
