import Editor from '@monaco-editor/react'

interface CodePanelProps {
  code: string
  isDirty: boolean
  isSaving?: boolean
  onChangeCode: (code: string) => void
  onSave: () => Promise<void>
  onReset: () => void
}

export function CodePanel({
  code,
  isDirty,
  isSaving = false,
  onChangeCode,
  onSave,
  onReset,
}: CodePanelProps) {
  return (
    <aside className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">代码</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            右侧修改代码，预览会即时更新。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={!isDirty || isSaving}
            className="px-2.5 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            还原
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={!isDirty || isSaving}
            className="px-2.5 py-1.5 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 min-h-0">
        <div className="h-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <Editor
            height="100%"
            defaultLanguage="html"
            language="html"
            theme="vs-light"
            value={code}
            onChange={(value) => onChangeCode(value ?? '')}
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              tabSize: 2,
              fontSize: 13,
              fontFamily: 'Menlo, Monaco, Consolas, monospace',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              formatOnPaste: true,
              formatOnType: true,
              lineNumbers: 'on',
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
      </div>
    </aside>
  )
}
