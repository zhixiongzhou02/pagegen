export function CodePanel() {
  return (
    <aside className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">代码</h2>
      </div>
      <div className="flex-1 p-4">
        <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-auto">
          {/* Code will be displayed here */}
          &lt;!-- 代码将显示在这里 --&gt;
        </pre>
      </div>
    </aside>
  )
}
