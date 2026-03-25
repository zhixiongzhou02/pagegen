import { useEffect, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Preview } from './components/Preview'
import { CodePanel } from './components/CodePanel'
import { ChatInput } from './components/ChatInput'
import { SettingsModal } from './components/SettingsModal'
import { useProjectStore } from './store/projectStore'
import { ipcService } from './services/ipc'
import type { AppSettings } from './types'
import './App.css'

const DEFAULT_SETTINGS: AppSettings = {
  apiProvider: 'claude',
  apiKey: '',
  model: 'claude-3-5-sonnet-20241022',
  theme: 'system',
}

function App() {
  const {
    projects,
    currentProject,
    currentPage,
    isLoading,
    error,
    setProjects,
    addProject,
    setCurrentProject,
    setCurrentPage,
    setLoading,
    setError,
    updateProject,
  } = useProjectStore()
  const [draftCode, setDraftCode] = useState('')
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const initializeProjects = async () => {
      setLoading(true)
      setError(null)

      try {
        const loadedProjects = await ipcService.getProjects()

        if (!isMounted) {
          return
        }

        setProjects(loadedProjects)

        const firstProject = loadedProjects[0] ?? null
        setCurrentProject(firstProject)
        setCurrentPage(firstProject?.pages[0] ?? null)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        const message = loadError instanceof Error ? loadError.message : '加载项目失败'
        setError(message)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void initializeProjects()

    return () => {
      isMounted = false
    }
  }, [setCurrentPage, setCurrentProject, setError, setLoading, setProjects])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await ipcService.getSettings()
        setSettings(loadedSettings)
      } catch (settingsError) {
        const message = settingsError instanceof Error ? settingsError.message : '加载设置失败'
        setError(message)
      }
    }

    void loadSettings()
  }, [setError])

  useEffect(() => {
    const root = document.documentElement

    if (settings.theme === 'dark') {
      root.classList.add('dark')
      return
    }

    if (settings.theme === 'light') {
      root.classList.remove('dark')
      return
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }, [settings.theme])

  useEffect(() => {
    setDraftCode(currentPage?.currentCode ?? '')
  }, [currentPage?.id, currentPage?.currentCode])

  const isCodeDirty = useMemo(
    () => draftCode !== (currentPage?.currentCode ?? ''),
    [currentPage?.currentCode, draftCode],
  )

  const handleSelectProject = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId) ?? null
    setCurrentProject(project)
    setCurrentPage(project?.pages[0] ?? null)
    setError(null)
  }

  const handleCreateProject = async () => {
    const name = window.prompt('输入项目名称', `项目 ${projects.length + 1}`)?.trim()
    if (!name) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const project = await ipcService.createProject({ name })
      addProject(project)
      setCurrentProject(project)
      setCurrentPage(project.pages[0] ?? null)
      setDraftCode(project.pages[0]?.currentCode ?? '')
      setSuccessMessage(`已创建项目“${project.name}”`)
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : '创建项目失败'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePage = async (prompt: string) => {
    if (!currentProject || !currentPage) {
      setError('请先创建并选中一个项目')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const project = await ipcService.generatePage(currentProject.id, currentPage.id, prompt)
      updateProject(project)
      setCurrentProject(project)
      const nextPage = project.pages.find((page) => page.id === currentPage.id) ?? project.pages[0] ?? null
      setCurrentPage(nextPage)
      setDraftCode(nextPage?.currentCode ?? '')
      setSuccessMessage('页面已生成并保存')
    } catch (generateError) {
      const message = generateError instanceof Error ? generateError.message : '页面生成失败'
      setError(message)
      throw generateError
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCode = async () => {
    if (!currentProject || !currentPage) {
      setError('当前没有可保存的页面')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await ipcService.savePageCode(currentProject.id, currentPage.id, draftCode)

      const updatedProject = {
        ...currentProject,
        updatedAt: Date.now(),
        pages: currentProject.pages.map((page) =>
          page.id === currentPage.id
            ? { ...page, currentCode: draftCode }
            : page,
        ),
      }
      const updatedPage = updatedProject.pages.find((page) => page.id === currentPage.id) ?? null

      updateProject(updatedProject)
      setCurrentProject(updatedProject)
      setCurrentPage(updatedPage)
      setDraftCode(updatedPage?.currentCode ?? '')
      setSuccessMessage('代码已保存')
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : '保存代码失败'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetCode = () => {
    setDraftCode(currentPage?.currentCode ?? '')
    setError(null)
  }

  const handleSaveSettings = async (nextSettings: AppSettings) => {
    setLoading(true)
    setError(null)

    try {
      const savedSettings = await ipcService.saveSettings(nextSettings)
      setSettings(savedSettings)
      setIsSettingsOpen(false)
      setSuccessMessage('设置已保存')
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : '保存设置失败'
      setError(message)
      throw saveError
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    if (!currentProject || !currentPage) {
      setError('请先创建并选中一个项目')
      return
    }

    const exportMode = window
      .prompt('输入导出模式：page 导出当前页面，project 导出整个项目', 'page')
      ?.trim()
      .toLowerCase()

    if (!exportMode) {
      return
    }

    const defaultPath = settings.defaultExportPath ?? '/Users/mac/Desktop/PageGenExports'
    const exportTarget = window.prompt(
      exportMode === 'project'
        ? '输入导出目录'
        : '输入导出文件完整路径（例如 /Users/mac/Desktop/PageGenExports/index.html）',
      exportMode === 'project'
        ? defaultPath
        : `${defaultPath}/${currentPage.path}`,
    )?.trim()

    if (!exportTarget) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const exportedPath = exportMode === 'project'
        ? await ipcService.exportProjectFiles(currentProject.id, exportTarget)
        : await ipcService.exportCurrentPage(currentProject.id, currentPage.id, exportTarget)

      setSuccessMessage(`导出完成：${exportedPath}`)
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : '导出失败'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary-600">PageGen</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            设置
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded hover:bg-primary-600"
          >
            导出
          </button>
          <button
            type="button"
            onClick={handleCreateProject}
            className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded hover:bg-primary-600"
          >
            新建项目
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {error ? (
          <div className="absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 shadow">
            {error}
          </div>
        ) : null}
        {successMessage ? (
          <div className="absolute left-1/2 top-28 z-10 -translate-x-1/2 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700 shadow">
            {successMessage}
          </div>
        ) : null}

        {/* Left Sidebar */}
        <Sidebar
          projects={projects}
          currentProjectId={currentProject?.id ?? null}
          onCreateProject={handleCreateProject}
          onSelectProject={handleSelectProject}
          isLoading={isLoading}
        />

        {/* Center Preview */}
        <Preview
          code={draftCode}
          pageName={currentPage?.name ?? null}
        />

        {/* Right Code Panel */}
        <CodePanel
          code={draftCode}
          isDirty={isCodeDirty}
          isSaving={isLoading}
          onChangeCode={setDraftCode}
          onSave={handleSaveCode}
          onReset={handleResetCode}
        />
      </div>

      {/* Bottom Chat Input */}
      <ChatInput
        hasActiveProject={Boolean(currentProject)}
        isSubmitting={isLoading}
        onSubmitPrompt={handleGeneratePage}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        isSaving={isLoading}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
    </div>
  )
}

export default App
