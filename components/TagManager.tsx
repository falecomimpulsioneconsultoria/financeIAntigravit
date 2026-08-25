import React, { useState } from 'react';

interface TagManagerProps {
    availableTags: string[];
    onRenameTag: (oldTag: string, newTag: string) => void;
    onDeleteTag: (tag: string) => void;
}

export const TagManager: React.FC<TagManagerProps> = ({ availableTags, onRenameTag, onDeleteTag }) => {
    const [editingTag, setEditingTag] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const handleSaveEdit = (oldTag: string) => {
        const newTag = editValue.trim();
        if (newTag && newTag !== oldTag) {
            onRenameTag(oldTag, newTag);
        }
        setEditingTag(null);
    };

    const handleDelete = (tag: string) => {
        if (window.confirm(`Tem certeza que deseja excluir a tag "${tag}"? Ela será removida de todos os lançamentos que a utilizam.`)) {
            onDeleteTag(tag);
        }
    };

    const filteredTags = availableTags.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100/50 overflow-hidden flex flex-col h-full animate-fade-in max-w-4xl mx-auto w-full">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/50 to-white">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 tracking-tight">Gerenciar Tags</h2>
                    <p className="text-sm text-gray-500 mt-1">Visualize, renomeie ou exclua as tags utilizadas em seus lançamentos.</p>
                </div>
                
                <div className="relative w-full sm:w-64">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar tag..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 pl-9 pr-4 bg-white border border-gray-200 rounded-xl text-sm w-full focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-gray-50/30">
                {filteredTags.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 font-medium">Nenhuma tag encontrada.</p>
                        <p className="text-sm text-gray-400 mt-1">As tags são criadas automaticamente ao serem adicionadas em lançamentos.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredTags.map(tag => (
                            <div key={tag} className="bg-white p-3 sm:p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 group hover:border-blue-200 transition-colors">
                                {editingTag === tag ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleSaveEdit(tag);
                                                if (e.key === 'Escape') setEditingTag(null);
                                            }}
                                            className="flex-1 h-8 px-2 text-sm border border-gray-200 rounded-md focus:border-blue-400 outline-none"
                                        />
                                        <button onClick={() => handleSaveEdit(tag)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        </button>
                                        <button onClick={() => setEditingTag(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                </svg>
                                            </span>
                                            <span className="font-semibold text-gray-700 truncate">#{tag}</span>
                                        </div>
                                        
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => { setEditingTag(tag); setEditValue(tag); }}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="Renomear Tag"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(tag)}
                                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                                                title="Excluir Tag"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
