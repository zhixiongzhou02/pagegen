interface PreviewProps {
  code: string
  pageName: string | null
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

export function Preview({ code, pageName }: PreviewProps) {
  return (
    <main className="flex-1 bg-gray-100 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full h-full max-w-5xl overflow-hidden">
          <iframe
            className="w-full h-full"
            sandbox="allow-scripts allow-same-origin"
            title="preview"
            srcDoc={code || EMPTY_PREVIEW_HTML}
          />
        </div>
      </div>
      {/* Device selector */}
      <div className="h-12 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-4">
        <span className="mr-auto pl-4 text-sm text-gray-500 dark:text-gray-400">
          {pageName ? `当前页面：${pageName}` : '当前页面：未选择'}
        </span>
        <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">💻</button>
        <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">📱</button>
      </div>
    </main>
  )
}
