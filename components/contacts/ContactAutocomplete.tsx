import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Contact } from '../../types';

interface ContactAutocompleteProps {
  contacts: Contact[];
  value: string; // contactId
  onChange: (contactId: string) => void;
  onRequestCreate?: (name: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export function ContactAutocomplete({
  contacts,
  value,
  onChange,
  onRequestCreate,
  required = false,
  disabled = false,
}: ContactAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input display when value prop changes (e.g., editing an existing transaction)
  useEffect(() => {
    if (value) {
      const found = contacts.find((c) => c.id === value);
      setInputValue(found ? found.fantasyName : '');
    } else {
      setInputValue('');
    }
  }, [value, contacts]);

  const filtered = useCallback(() => {
    if (!inputValue.trim()) return contacts.filter((c) => c.isActive);
    const q = inputValue.toLowerCase();
    return contacts.filter(
      (c) =>
        c.isActive &&
        (c.fantasyName.toLowerCase().includes(q) ||
          (c.cpfCnpj || '').includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.legalName || '').toLowerCase().includes(q))
    );
  }, [inputValue, contacts]);

  const suggestions = filtered();

  const handleSelect = (contact: Contact) => {
    setInputValue(contact.fantasyName);
    onChange(contact.id);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && suggestions[highlightedIndex]) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If no contact selected and typed something, clear input
        if (!value && inputValue) {
          setInputValue('');
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [value, inputValue]);

  const selectedContact = value ? contacts.find((c) => c.id === value) : null;

  const labelColors: Record<string, string> = {
    Cliente: 'bg-blue-100 text-blue-700',
    Fornecedor: 'bg-amber-100 text-amber-700',
    Colaborador: 'bg-green-100 text-green-700',
    Tecnico: 'bg-purple-100 text-purple-700',
    Vendedor: 'bg-cyan-100 text-cyan-700',
    Transportadora: 'bg-orange-100 text-orange-700',
    Representada: 'bg-pink-100 text-pink-700',
    Credenciadora: 'bg-indigo-100 text-indigo-700',
    Fabricante: 'bg-teal-100 text-teal-700',
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        Pessoa / Fornecedor
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div
        className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 transition-all ${
          disabled
            ? 'bg-gray-50 border-gray-200 cursor-not-allowed'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-100'
            : required && !value
            ? 'border-red-300 bg-red-50/30'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        {/* Search icon */}
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          disabled={disabled}
          placeholder="Buscar por nome, CPF/CNPJ..."
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none min-w-0"
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(''); // clear selection while typing
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />

        {/* Clear button */}
        {(value || inputValue) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
            tabIndex={-1}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Required hint */}
      {required && !value && (
        <p className="text-[11px] text-red-500 mt-1">Campo obrigatório para novos lançamentos</p>
      )}

      {/* Selected contact chip */}
      {selectedContact && (
        <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            {selectedContact.fantasyName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{selectedContact.fantasyName}</p>
            {selectedContact.cpfCnpj && (
              <p className="text-[11px] text-gray-400">{selectedContact.cpfCnpj}</p>
            )}
          </div>
          {selectedContact.labels.slice(0, 2).map((label) => (
            <span key={label} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${labelColors[label] || 'bg-gray-100 text-gray-600'}`}>
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {suggestions.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-400 mb-2">Nenhum contato encontrado</p>
              {onRequestCreate && inputValue.trim() && (
                <button
                  type="button"
                  onClick={() => { onRequestCreate(inputValue.trim()); setIsOpen(false); }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5 mx-auto"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Criar "{inputValue.trim()}"
                </button>
              )}
            </div>
          ) : (
            <>
              {suggestions.map((contact, idx) => (
                <button
                  key={contact.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(contact); }}
                  className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors ${
                    idx === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {contact.fantasyName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{contact.fantasyName}</p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {contact.cpfCnpj ? contact.cpfCnpj : contact.email || ''}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {contact.labels.slice(0, 1).map((label) => (
                      <span key={label} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${labelColors[label] || 'bg-gray-100 text-gray-600'}`}>
                        {label}
                      </span>
                    ))}
                  </div>
                </button>
              ))}

              {/* Create new option */}
              {onRequestCreate && inputValue.trim() && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onRequestCreate(inputValue.trim()); setIsOpen(false); }}
                  className="w-full text-left flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full border-2 border-blue-300 border-dashed flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Criar "{inputValue.trim()}"</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
