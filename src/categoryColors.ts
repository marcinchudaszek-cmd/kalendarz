import { Category, CategoryColor, StoredCategory } from './types';

/**
 * Zamknięta paleta kolorów. Klasy muszą być wypisane dosłownie,
 * bo Tailwind skanuje kod źródłowy i nie wygeneruje nazw sklejanych w locie.
 */
export const CATEGORY_COLORS: CategoryColor[] = [
  {
    id: 'blue',
    name: 'Niebieski',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-500/15',
    textDark: 'dark:text-blue-300',
    borderColor: 'border-blue-500',
    dotColor: '#3b82f6',
  },
  {
    id: 'indigo',
    name: 'Indygo',
    color: 'bg-indigo-500',
    textColor: 'text-indigo-700',
    bgLight: 'bg-indigo-50',
    bgDark: 'dark:bg-indigo-500/15',
    textDark: 'dark:text-indigo-300',
    borderColor: 'border-indigo-500',
    dotColor: '#6366f1',
  },
  {
    id: 'purple',
    name: 'Fioletowy',
    color: 'bg-purple-500',
    textColor: 'text-purple-700',
    bgLight: 'bg-purple-50',
    bgDark: 'dark:bg-purple-500/15',
    textDark: 'dark:text-purple-300',
    borderColor: 'border-purple-500',
    dotColor: '#a855f7',
  },
  {
    id: 'pink',
    name: 'Różowy',
    color: 'bg-pink-500',
    textColor: 'text-pink-700',
    bgLight: 'bg-pink-50',
    bgDark: 'dark:bg-pink-500/15',
    textDark: 'dark:text-pink-300',
    borderColor: 'border-pink-500',
    dotColor: '#ec4899',
  },
  {
    id: 'red',
    name: 'Czerwony',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgLight: 'bg-red-50',
    bgDark: 'dark:bg-red-500/15',
    textDark: 'dark:text-red-300',
    borderColor: 'border-red-500',
    dotColor: '#ef4444',
  },
  {
    id: 'orange',
    name: 'Pomarańczowy',
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgLight: 'bg-orange-50',
    bgDark: 'dark:bg-orange-500/15',
    textDark: 'dark:text-orange-300',
    borderColor: 'border-orange-500',
    dotColor: '#f97316',
  },
  {
    id: 'amber',
    name: 'Bursztynowy',
    color: 'bg-amber-500',
    textColor: 'text-amber-700',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-500/15',
    textDark: 'dark:text-amber-300',
    borderColor: 'border-amber-500',
    dotColor: '#f59e0b',
  },
  {
    id: 'lime',
    name: 'Limonkowy',
    color: 'bg-lime-500',
    textColor: 'text-lime-700',
    bgLight: 'bg-lime-50',
    bgDark: 'dark:bg-lime-500/15',
    textDark: 'dark:text-lime-300',
    borderColor: 'border-lime-500',
    dotColor: '#84cc16',
  },
  {
    id: 'green',
    name: 'Zielony',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgLight: 'bg-green-50',
    bgDark: 'dark:bg-green-500/15',
    textDark: 'dark:text-green-300',
    borderColor: 'border-green-500',
    dotColor: '#22c55e',
  },
  {
    id: 'teal',
    name: 'Morski',
    color: 'bg-teal-500',
    textColor: 'text-teal-700',
    bgLight: 'bg-teal-50',
    bgDark: 'dark:bg-teal-500/15',
    textDark: 'dark:text-teal-300',
    borderColor: 'border-teal-500',
    dotColor: '#14b8a6',
  },
  {
    id: 'cyan',
    name: 'Turkusowy',
    color: 'bg-cyan-500',
    textColor: 'text-cyan-700',
    bgLight: 'bg-cyan-50',
    bgDark: 'dark:bg-cyan-500/15',
    textDark: 'dark:text-cyan-300',
    borderColor: 'border-cyan-500',
    dotColor: '#06b6d4',
  },
  {
    id: 'slate',
    name: 'Grafitowy',
    color: 'bg-slate-500',
    textColor: 'text-slate-700',
    bgLight: 'bg-slate-50',
    bgDark: 'dark:bg-slate-500/15',
    textDark: 'dark:text-slate-300',
    borderColor: 'border-slate-500',
    dotColor: '#64748b',
  },
];

export function getCategoryColor(colorId: string): CategoryColor {
  return CATEGORY_COLORS.find((c) => c.id === colorId) ?? CATEGORY_COLORS[0];
}

/** Dokłada do zapisanej kategorii klasy wynikające z wybranego koloru. */
export function hydrateCategory(stored: StoredCategory): Category {
  const color = getCategoryColor(stored.colorId);
  return { ...color, id: stored.id, name: stored.name, colorId: color.id };
}

export function hydrateCategories(stored: StoredCategory[]): Category[] {
  return stored.map(hydrateCategory);
}

export function dehydrateCategories(categories: Category[]): StoredCategory[] {
  return categories.map((c) => ({ id: c.id, name: c.name, colorId: c.colorId }));
}

export const DEFAULT_CATEGORIES: StoredCategory[] = [
  { id: 'work', name: 'Praca', colorId: 'blue' },
  { id: 'personal', name: 'Osobiste', colorId: 'green' },
  { id: 'meeting', name: 'Spotkania', colorId: 'purple' },
  { id: 'health', name: 'Zdrowie', colorId: 'red' },
  { id: 'social', name: 'Towarzyskie', colorId: 'amber' },
  { id: 'travel', name: 'Podróże', colorId: 'teal' },
];
