export function Preview() {
  return (
    <main className="flex-1 bg-gray-100 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full h-full max-w-5xl overflow-hidden">
          <iframe
            className="w-full h-full"
            sandbox="allow-scripts allow-same-origin"
            title="preview"
          />
        </div>
      </div>
      {/* Device selector */}
      <div className="h-12 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-4">
        <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">💻</button>
        <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">📱</button>
      </div>
    </main>
  )
}
