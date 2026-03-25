import React, { useState } from 'react'

interface ChatInputProps {
  hasActiveProject: boolean
  isSubmitting?: boolean
  onSubmitPrompt: (prompt: string) => Promise<void>
}

export function ChatInput({
  hasActiveProject,
  isSubmitting = false,
  onSubmitPrompt,
}: ChatInputProps) {
  const [input, setInput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    if (!hasActiveProject) {
      window.alert('请先创建并选中一个项目。')
      return
    }

    const prompt = input.trim()

    try {
      await onSubmitPrompt(prompt)
      setInput('')
    } catch {
      // Errors are surfaced by the parent component.
    }
  }

  return (
    <form onSubmit={handleSubmit} className="h-20 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex gap-4">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={hasActiveProject ? '描述你想要的页面...' : '请先创建一个项目，再开始描述页面需求'}
        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <button
        type="submit"
        disabled={!hasActiveProject || isSubmitting}
        className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {isSubmitting ? '生成中...' : '发送'}
      </button>
    </form>
  )
}
