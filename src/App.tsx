import { useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Preview } from './components/Preview'
import { CodePanel } from './components/CodePanel'
import { ChatInput } from './components/ChatInput'
import { useProjectStore } from './store/projectStore'
import './App.css'

function App() {
  const { setProjects } = useProjectStore()

  useEffect(() => {
    // Load projects on mount
    // TODO: Call Rust backend to load projects
  }, [setProjects])

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary-600">PageGen</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
            设置
          </button>
          <button className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded hover:bg-primary-600">
            导出
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Center Preview */}
        <Preview />

        {/* Right Code Panel */}
        <CodePanel />
      </div>

      {/* Bottom Chat Input */}
      <ChatInput />
    </div>
  )
}

export default App
