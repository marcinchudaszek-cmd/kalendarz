import React, { useEffect, useState } from 'react';
import { Category } from '../types';
import { CATEGORY_COLORS, getCategoryColor } from '../categoryColors';
import { cn } from '../utils/cn';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSave: (categories: Category[]) => void;
  /** Ile wydarzeń korzysta z danej kategorii — pokazujemy to przy usuwaniu. */
  usageCount: (categoryId: string) => number;
  makeId: () => string;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  isOpen,
  onClose,
  categories,
  onSave,
  usageCount,
  makeId,
}) => {
  const [draft, setDraft] = useState<Category[]>(categories);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDraft(categories);
      setNewName('');
    }
  }, [isOpen, categories]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const rename = (id: string, name: string) =>
    setDraft((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));

  const recolor = (id: string, colorId: string) =>
    setDraft((prev) =>
      prev.map((c) => (c.id === id ? { ...getCategoryColor(colorId), id: c.id, name: c.name, colorId } : c))
    );

  const remove = (id: string) => setDraft((prev) => prev.filter((c) => c.id !== id));

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    // Kolejny kolor z palety, żeby nowa kategoria nie zlewała się z poprzednią.
    const colorId = CATEGORY_COLORS[draft.length % CATEGORY_COLORS.length].id;
    setDraft((prev) => [
      ...prev,
      { ...getCategoryColor(colorId), id: makeId(), name, colorId },
    ]);
    setNewName('');
  };

  const handleSave = () => {
    const cleaned = draft
      .map((c) => ({ ...c, name: c.name.trim() }))
      .filter((c) => c.name.length > 0);
    if (cleaned.length === 0) return;
    onSave(cleaned);
    onClose();
  };

  const removedInUse = categories
    .filter((c) => !draft.some((d) => d.id === c.id))
    .map((c) => ({ name: c.name, count: usageCount(c.id) }))
    .filter((c) => c.count > 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in">
        <div className="px-6 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Kategorie</h2>
        </div>

        <div className="px-6 max-h-80 overflow-y-auto space-y-2">
          {draft.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              <select
                value={category.colorId}
                onChange={(e) => recolor(category.id, e.target.value)}
                aria-label={`Kolor kategorii ${category.name}`}
                className="px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 focus:border-blue-500 outline-none"
              >
                {CATEGORY_COLORS.map((color) => (
                  <option key={color.id} value={color.id}>
                    {color.name}
                  </option>
                ))}
              </select>

              <span className={cn('w-4 h-4 rounded flex-shrink-0', category.color)} />

              <input
                type="text"
                value={category.name}
                onChange={(e) => rename(category.id, e.target.value)}
                aria-label="Nazwa kategorii"
                className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg focus:border-blue-500 outline-none"
              />

              <button
                type="button"
                onClick={() => remove(category.id)}
                disabled={draft.length === 1}
                aria-label={`Usuń kategorię ${category.name}`}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/15 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="px-6 pt-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="Nazwa nowej kategorii"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:border-blue-500 outline-none"
            />
            <button
              type="button"
              onClick={add}
              className="px-4 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors"
            >
              Dodaj
            </button>
          </div>
        </div>

        {removedInUse.length > 0 && (
          <p className="px-6 pt-3 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            {removedInUse.map((c) => `„${c.name}" (${c.count})`).join(', ')} — wydarzenia z usuwanych
            kategorii trafią do „{draft[0]?.name}".
          </p>
        )}

        <div className="flex justify-end gap-2 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-sm"
          >
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
};
