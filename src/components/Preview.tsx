import { useEffect, useMemo, useRef } from 'react'
import { buildPreviewDocument } from '../lib/preview'
import type { PreviewElementSelection } from '../types'

type PreviewDevice = 'desktop' | 'mobile'

interface PreviewProps {
  code: string
  pageName: string | null
  deviceMode: PreviewDevice
  selectedElement: PreviewElementSelection | null
  onChangeDeviceMode: (mode: PreviewDevice) => void
  onSelectElement: (selection: PreviewElementSelection | null) => void
}

const EMPTY_PREVIEW_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: linear-gradient(135deg, #f8fafc, #eef2ff);
        color: #64748b;
      }
      .empty {
        text-align: center;
        padding: 24px;
      }
      .title {
        color: #0f172a;
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 8px;
      }
    </style>
  </head>
  <body>
    <div class="empty">
      <div class="title">预览区已就绪</div>
      <div>创建项目后，这里会显示当前页面内容。</div>
    </div>
  </body>
</html>`

export function Preview({
  code,
  pageName,
  deviceMode,
  selectedElement,
  onChangeDeviceMode,
  onSelectElement,
}: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const frameWidthClass =
    deviceMode === 'mobile' ? 'max-w-[390px]' : 'max-w-5xl'

  const frameHeightClass =
    deviceMode === 'mobile' ? 'max-h-[844px]' : 'h-full'

  const previewDocument = useMemo(
    () => buildPreviewDocument(code || EMPTY_PREVIEW_HTML),
    [code],
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return
      }

      const data = event.data
      if (
        typeof data !== 'object' ||
        data === null ||
        data.source !== 'pagegen-preview' ||
        data.type !== 'element-selected'
      ) {
        return
      }

      onSelectElement(data.payload as PreviewElementSelection)
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [onSelectElement])

  return (
    <main className="flex-1 bg-gray-100 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full ${frameHeightClass} ${frameWidthClass} overflow-hidden transition-all duration-200`}>
          <iframe
            ref={iframeRef}
            className="w-full h-full"
            sandbox="allow-scripts allow-same-origin"
            title="preview"
            srcDoc={previewDocument}
          />
        </div>
      </div>
      {/* Device selector */}
      <div className="h-12 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-4">
        <span className="mr-auto pl-4 text-sm text-gray-500 dark:text-gray-400">
          {pageName ? `当前页面：${pageName}` : '当前页面：未选择'}
        </span>
        {selectedElement ? (
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            已选中：{selectedElement.selector}
          </span>
        ) : (
          <span className="text-xs text-gray-400">点击预览元素可定位源码</span>
        )}
        <button
          type="button"
          onClick={() => onChangeDeviceMode('desktop')}
          className={`rounded px-3 py-1.5 text-sm ${
            deviceMode === 'desktop'
              ? 'bg-primary-500 text-white'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          桌面
        </button>
        <button
          type="button"
          onClick={() => onChangeDeviceMode('mobile')}
          className={`rounded px-3 py-1.5 text-sm ${
            deviceMode === 'mobile'
              ? 'bg-primary-500 text-white'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          手机
        </button>
      </div>
    </main>
  )
}
