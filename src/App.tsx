import { useEffect, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Preview } from './components/Preview'
import { CodePanel } from './components/CodePanel'
import { ChatInput } from './components/ChatInput'
import { SettingsModal } from './components/SettingsModal'
import { CreateProjectModal } from './components/CreateProjectModal'
import { ExportModal } from './components/ExportModal'
import { useProjectStore } from './store/projectStore'
import { ipcService } from './services/ipc'
import { createUserFacingError, formatUserFacingError } from './lib/utils'
import type { AppSettings, GenerationMode, PreviewElementSelection } from './types'
import './App.css'

const DEFAULT_SETTINGS: AppSettings = {
  apiProvider: 'claude',
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
  theme: 'system',
  generationMode: 'quality',
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
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [previewDeviceMode, setPreviewDeviceMode] = useState<'desktop' | 'mobile'>('desktop')
  const [selectedPreviewElement, setSelectedPreviewElement] = useState<PreviewElementSelection | null>(null)
  const [generationMode, setGenerationMode] = useState<GenerationMode>('quality')
  const [generationStatus, setGenerationStatus] = useState<string | null>(null)
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

        setError(formatUserFacingError('加载项目', loadError))
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
        setGenerationMode(loadedSettings.generationMode)
      } catch (settingsError) {
        setError(formatUserFacingError('加载设置', settingsError))
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
    setSelectedPreviewElement(null)
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

  const handleOpenCreateProject = () => {
    setIsCreateProjectOpen(true)
    setError(null)
  }

  const handleCreateProject = async (name: string) => {
    setLoading(true)
    setError(null)

    try {
      const project = await ipcService.createProject({ name })
      addProject(project)
      setCurrentProject(project)
      setCurrentPage(project.pages[0] ?? null)
      setDraftCode(project.pages[0]?.currentCode ?? '')
      setIsCreateProjectOpen(false)
      setSuccessMessage(`已创建项目“${project.name}”`)
    } catch (createError) {
      setError(formatUserFacingError('创建项目', createError))
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePage = async (prompt: string) => {
    if (!currentProject || !currentPage) {
      setError(createUserFacingError('无法生成页面', '当前没有可用的项目或页面。', '请先创建并选中一个项目。'))
      return
    }

    const startedAt = Date.now()
    setLoading(true)
    setError(null)
    setGenerationStatus(generationMode === 'fast' ? '快速模式生成中...' : '高质量模式生成中...')

    try {
      const project = await ipcService.generatePage(currentProject.id, currentPage.id, prompt, generationMode)
      updateProject(project)
      setCurrentProject(project)
      const nextPage = project.pages.find((page) => page.id === currentPage.id) ?? project.pages[0] ?? null
      setCurrentPage(nextPage)
      setDraftCode(nextPage?.currentCode ?? '')
      setSelectedPreviewElement(null)
      const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1)
      setSuccessMessage(`页面已生成并保存，用时 ${durationSeconds} 秒`)
      setGenerationStatus(null)
    } catch (generateError) {
      setError(formatUserFacingError('页面生成', generateError))
      setGenerationStatus(null)
    } finally {
      setLoading(false)
    }
  }

  const handleChangeGenerationMode = async (nextMode: GenerationMode) => {
    if (nextMode === generationMode) {
      return
    }

    const previousSettings = settings
    const nextSettings = {
      ...settings,
      generationMode: nextMode,
    }

    setGenerationMode(nextMode)
    setGenerationStatus(null)
    setSettings(nextSettings)

    try {
      const savedSettings = await ipcService.saveSettings(nextSettings)
      setSettings(savedSettings)
    } catch (saveError) {
      setGenerationMode(previousSettings.generationMode)
      setSettings(previousSettings)
      setError(formatUserFacingError('保存生成模式', saveError))
    }
  }

  const handleSaveCode = async () => {
    if (!currentProject || !currentPage) {
      setError(createUserFacingError('无法保存代码', '当前没有可保存的页面。', '请先创建并选中一个项目。'))
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
      setSelectedPreviewElement(null)
      setSuccessMessage('代码已保存')
    } catch (saveError) {
      setError(formatUserFacingError('保存代码', saveError))
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
      setGenerationMode(savedSettings.generationMode)
      setIsSettingsOpen(false)
      setSuccessMessage('设置已保存')
    } catch (saveError) {
      setError(formatUserFacingError('保存设置', saveError))
    } finally {
      setLoading(false)
    }
  }

  const handleOpenExport = () => {
    if (!currentProject || !currentPage) {
      setError(createUserFacingError('无法导出', '当前没有可导出的项目或页面。', '请先创建并选中一个项目。'))
      return
    }

    setError(null)
    setIsExportOpen(true)
  }

  const handleExport = async (mode: 'page' | 'project', exportTarget: string) => {
    if (!currentProject || !currentPage) {
      setError(createUserFacingError('无法导出', '当前没有可导出的项目或页面。', '请先创建并选中一个项目。'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const exportedPath = mode === 'project'
        ? await ipcService.exportProjectFiles(currentProject.id, exportTarget)
        : await ipcService.exportCurrentPage(currentProject.id, currentPage.id, exportTarget)

      setIsExportOpen(false)
      setSuccessMessage(`导出完成：${exportedPath}`)
    } catch (exportError) {
      setError(formatUserFacingError('导出', exportError))
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
            onClick={handleOpenExport}
            className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded hover:bg-primary-600"
          >
            导出
          </button>
          <button
            type="button"
            onClick={handleOpenCreateProject}
            className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded hover:bg-primary-600"
          >
            新建项目
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {error ? (
          <div className="absolute left-1/2 top-16 z-10 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow">
            <p className="font-semibold">{error.title}</p>
            <p className="mt-1">{error.detail}</p>
            {error.suggestion ? <p className="mt-1 text-red-700/90">建议：{error.suggestion}</p> : null}
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
          onCreateProject={handleOpenCreateProject}
          onSelectProject={handleSelectProject}
          isLoading={isLoading}
        />

        {/* Center Preview */}
        <Preview
          code={draftCode}
          pageName={currentPage?.name ?? null}
          deviceMode={previewDeviceMode}
          selectedElement={selectedPreviewElement}
          onChangeDeviceMode={setPreviewDeviceMode}
          onSelectElement={setSelectedPreviewElement}
        />

        {/* Right Code Panel */}
        <CodePanel
          code={draftCode}
          isDirty={isCodeDirty}
          isSaving={isLoading}
          selectedElement={selectedPreviewElement}
          onChangeCode={(nextCode) => {
            setDraftCode(nextCode)
            setSelectedPreviewElement(null)
          }}
          onSave={handleSaveCode}
          onReset={handleResetCode}
        />
      </div>

      {/* Bottom Chat Input */}
      <ChatInput
        hasActiveProject={Boolean(currentProject)}
        isSubmitting={isLoading}
        generationMode={generationMode}
        statusMessage={generationStatus}
        onChangeGenerationMode={(mode) => void handleChangeGenerationMode(mode)}
        onSubmitPrompt={handleGeneratePage}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        isSaving={isLoading}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        isSaving={isLoading}
        defaultName={`项目 ${projects.length + 1}`}
        onClose={() => setIsCreateProjectOpen(false)}
        onSubmit={handleCreateProject}
      />

      <ExportModal
        isOpen={isExportOpen}
        isSaving={isLoading}
        defaultExportPath={settings.defaultExportPath ?? '/Users/mac/Desktop/PageGenExports'}
        projectName={currentProject?.name ?? 'pagegen-export'}
        currentPagePath={currentPage?.path ?? 'index.html'}
        onClose={() => setIsExportOpen(false)}
        onSubmit={handleExport}
      />
    </div>
  )
}

export default App
