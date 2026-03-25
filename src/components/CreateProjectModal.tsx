import { useEffect, useState } from 'react'

interface CreateProjectModalProps {
  isOpen: boolean
  isSaving?: boolean
  defaultName: string
  onClose: () => void
  onSubmit: (name: string) => Promise<void>
}

export function CreateProjectModal({
  isOpen,
  isSaving = false,
  defaultName,
  onClose,
  onSubmit,
}: CreateProjectModalProps) {
  const [name, setName] = useState(defaultName)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setName(defaultName)
    setError(null)
  }, [defaultName, isOpen])

  if (!isOpen) {
    return null
  }

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('请输入项目名称')
      return
    }

    setError(null)
    await onSubmit(trimmed)
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">新建项目</h2>
            <p className="mt-1 text-sm text-slate-500">输入项目名称后立即创建默认页面。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            关闭
          </button>
        </div>

        <div className="px-6 py-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">项目名称</span>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleSubmit()
                }
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="例如：营销落地页"
            />
          </label>

          {error ? (
            <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
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
            {isSaving ? '创建中...' : '创建项目'}
          </button>
        </div>
      </div>
    </div>
  )
}
