import React from 'react';

interface EmptyStateProps {
  onCreate: () => void;
  onLoadSamples: () => void;
}

/**
 * Zaproszenie pokazywane, gdy kalendarz jest zupełnie pusty — czyli przy pierwszym
 * uruchomieniu po instalacji. Nie blokuje siatki: kliknięcie obok karty nadal działa.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ onCreate, onLoadSamples }) => (
  <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none z-20">
    <div className="pointer-events-auto max-w-sm w-full text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-6">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center">
        <svg
          className="w-7 h-7 text-blue-500 dark:text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.6}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
        Twój kalendarz jest pusty
      </h2>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
        Dodaj pierwsze wydarzenie i ustaw przypomnienie, albo zacznij od kilku przykładów,
        żeby rozejrzeć się po aplikacji.
      </p>

      <div className="mt-5 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onCreate}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg shadow-sm transition-colors"
        >
          Dodaj wydarzenie
        </button>
        <button
          type="button"
          onClick={onLoadSamples}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Wczytaj przykłady
        </button>
      </div>
    </div>
  </div>
);
