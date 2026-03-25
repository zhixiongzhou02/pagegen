export function Sidebar() {
  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">项目</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {/* Project list will go here */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          暂无项目
        </div>
      </div>
    </aside>
  )
}
