import type { Project } from '../types'

interface SidebarProps {
  projects: Project[]
  currentProjectId: string | null
  onCreateProject: () => void
  onSelectProject: (projectId: string) => void
  isLoading?: boolean
}

export function Sidebar({
  projects,
  currentProjectId,
  onCreateProject,
  onSelectProject,
  isLoading = false,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">项目</h2>
        <button
          type="button"
          onClick={onCreateProject}
          className="px-2.5 py-1 text-xs font-medium bg-primary-500 text-white rounded hover:bg-primary-600"
        >
          新建
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">正在加载项目...</div>
        ) : projects.length === 0 ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">暂无项目</div>
            <button
              type="button"
              onClick={onCreateProject}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              创建第一个项目
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => {
              const isActive = project.id === currentProjectId

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onSelectProject(project.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    isActive
                      ? 'border-primary-500 bg-primary-50 text-primary-900'
                      : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">{project.name}</div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {project.pages.length} 个页面
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
