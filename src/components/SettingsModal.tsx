import { useEffect, useState } from 'react'
import type { AppSettings } from '../types'
import { CLAUDE_MODELS, OPENAI_MODELS, validateApiKey } from '../lib/ai'

interface SettingsModalProps {
  isOpen: boolean
  settings: AppSettings
  isSaving?: boolean
  onClose: () => void
  onSave: (settings: AppSettings) => Promise<void>
}

export function SettingsModal({
  isOpen,
  settings,
  isSaving = false,
  onClose,
  onSave,
}: SettingsModalProps) {
  const [draft, setDraft] = useState(settings)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(settings)
    setError(null)
  }, [settings, isOpen])

  if (!isOpen) {
    return null
  }

  const modelOptions = draft.apiProvider === 'claude' ? CLAUDE_MODELS : OPENAI_MODELS

  const handleProviderChange = (provider: AppSettings['apiProvider']) => {
    const defaultModel =
      provider === 'claude' ? CLAUDE_MODELS[0].value : OPENAI_MODELS[0].value

    setDraft((current) => ({
      ...current,
      apiProvider: provider,
      model: defaultModel,
    }))
  }

  const handleSave = async () => {
    const validation = validateApiKey(draft.apiKey)
    if (!validation.valid) {
      setError(validation.error ?? 'API Key 无效')
      return
    }

    setError(null)
    await onSave(draft)
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">设置</h2>
            <p className="mt-1 text-sm text-slate-500">配置模型提供方、API Key 和主题。</p>
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
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">API Provider</span>
            <select
              value={draft.apiProvider}
              onChange={(event) => handleProviderChange(event.target.value as AppSettings['apiProvider'])}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="claude">Claude</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">模型</span>
            <select
              value={draft.model}
              onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">API Key</span>
            <input
              type="password"
              value={draft.apiKey}
              onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="输入 API Key"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">主题</span>
            <select
              value={draft.theme}
              onChange={(event) => setDraft((current) => ({
                ...current,
                theme: event.target.value as AppSettings['theme'],
              }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">默认导出路径</span>
            <input
              type="text"
              value={draft.defaultExportPath ?? ''}
              onChange={(event) => setDraft((current) => ({
                ...current,
                defaultExportPath: event.target.value || undefined,
              }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="/Users/mac/Desktop/PageGenExports"
            />
          </label>

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
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:bg-gray-400"
          >
            {isSaving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  )
}
