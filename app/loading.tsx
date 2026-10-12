// Shown while a page's server data loads, so navigation feels instant.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl animate-pulse p-6" aria-busy="true" aria-label="Loading">
      <div className="mb-3 h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
      <div className="mb-8 h-4 w-72 rounded bg-gray-200 dark:bg-gray-800" />
      {[0, 1].map((card) => (
        <div key={card} className="mb-8 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="h-64 bg-gray-200 dark:bg-gray-800" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center justify-between gap-4 border-t border-gray-200 p-4 dark:border-gray-800">
              <div className="h-4 flex-1 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-8 w-24 rounded-full bg-gray-200 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
