import { useEffect, useMemo, useState } from 'react'

type ExportMode = 'page' | 'project'

interface ExportModalProps {
  isOpen: boolean
  isSaving?: boolean
  defaultExportPath: string
  projectName: string
  currentPagePath: string
  onClose: () => void
  onSubmit: (mode: ExportMode, targetPath: string) => Promise<void>
}

function sanitizeProjectName(name: string): string {
  const sanitized = name.replace(/[\/\\:*?"<>|]/g, '-').trim()
  return sanitized || 'pagegen-export'
}

function joinPath(basePath: string, suffix: string): string {
  const trimmedBase = basePath.trim().replace(/\/+$/g, '')
  const trimmedSuffix = suffix.trim().replace(/^\/+/g, '')
  return trimmedBase ? `${trimmedBase}/${trimmedSuffix}` : trimmedSuffix
}

export function ExportModal({
  isOpen,
  isSaving = false,
  defaultExportPath,
  projectName,
  currentPagePath,
  onClose,
  onSubmit,
}: ExportModalProps) {
  const [mode, setMode] = useState<ExportMode>('page')
  const [targetPath, setTargetPath] = useState('')
  const [error, setError] = useState<string | null>(null)

  const pageDefaultPath = useMemo(
    () => joinPath(defaultExportPath, currentPagePath),
    [currentPagePath, defaultExportPath],
  )
  const projectPreviewPath = useMemo(
    () => joinPath(targetPath, sanitizeProjectName(projectName)),
    [projectName, targetPath],
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setMode('page')
    setTargetPath(pageDefaultPath)
    setError(null)
  }, [isOpen, pageDefaultPath])

  if (!isOpen) {
    return null
  }

  const handleModeChange = (nextMode: ExportMode) => {
    setMode(nextMode)
    setTargetPath(nextMode === 'project' ? defaultExportPath : pageDefaultPath)
    setError(null)
  }

  const handleSubmit = async () => {
    const trimmed = targetPath.trim()
    if (!trimmed) {
      setError(mode === 'project' ? '请输入导出目录' : '请输入导出文件路径')
      return
    }

    setError(null)
    await onSubmit(mode, trimmed)
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">导出</h2>
            <p className="mt-1 text-sm text-slate-500">选择导出类型、目标位置和默认命名规则。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            关闭
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">导出类型</span>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => handleModeChange('page')}
                className={`rounded-xl border px-4 py-3 text-left ${
                  mode === 'page'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-medium text-slate-900">当前页面</div>
                <div className="mt-1 text-xs text-slate-500">导出为单个 HTML 文件，文件名默认使用页面路径。</div>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('project')}
                className={`rounded-xl border px-4 py-3 text-left ${
                  mode === 'project'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-medium text-slate-900">整个项目</div>
                <div className="mt-1 text-xs text-slate-500">导出全部页面，并在目标目录下生成项目文件夹。</div>
              </button>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {mode === 'project' ? '导出目录' : '导出文件路径'}
            </span>
            <input
              autoFocus
              type="text"
              value={targetPath}
              onChange={(event) => setTargetPath(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleSubmit()
                }
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder={mode === 'project' ? '/Users/mac/Desktop/PageGenExports' : '/Users/mac/Desktop/PageGenExports/index.html'}
            />
          </label>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">导出规则</p>
            <p className="mt-2">
              {mode === 'project'
                ? `会在目标目录下创建项目文件夹：${projectPreviewPath}`
                : `会导出当前页面文件：${targetPath.trim() || pageDefaultPath}`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {mode === 'project'
                ? '项目名中的非法文件名字符会被替换为 -。'
                : '建议使用 .html 文件名，便于后续直接预览或部署。'}
            </p>
          </div>

          {error ? (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:bg-gray-400"
          >
            {isSaving ? '导出中...' : mode === 'project' ? '导出整个项目' : '导出当前页面'}
          </button>
        </div>
      </div>
    </div>
  )
}
