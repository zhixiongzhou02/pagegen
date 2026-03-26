import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { useProjectStore } from './store/projectStore'
import type { AppSettings, Project } from './types'

vi.mock('@monaco-editor/react', () => ({
  default: ({
    value,
    onChange,
  }: {
    value?: string
    onChange?: (value: string) => void
  }) => (
    <textarea
      data-testid="code-editor"
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}))

const ipcServiceMock = vi.hoisted(() => ({
  getProjects: vi.fn(),
  createProject: vi.fn(),
  generatePage: vi.fn(),
  savePageCode: vi.fn(),
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
  exportCurrentPage: vi.fn(),
  exportProjectFiles: vi.fn(),
}))

vi.mock('./services/ipc', () => ({
  ipcService: ipcServiceMock,
}))

const baseProject = (): Project => ({
  id: 'project-1',
  name: 'Landing Page',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  pages: [
    {
      id: 'page-1',
      name: 'index',
      path: 'index.html',
      currentCode: '<html><body>Initial</body></html>',
      versions: [],
    },
  ],
})

const baseSettings: AppSettings = {
  apiProvider: 'claude',
  apiKey: 'sk-test',
  model: 'claude-sonnet-4-20250514',
  theme: 'light',
  generationMode: 'quality',
  defaultExportPath: '/tmp/export',
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useProjectStore.setState({
      projects: [],
      currentProject: null,
      currentPage: null,
      isLoading: false,
      error: null,
    })

    ipcServiceMock.getProjects.mockResolvedValue([baseProject()])
    ipcServiceMock.getSettings.mockResolvedValue(baseSettings)
    ipcServiceMock.createProject.mockResolvedValue({
      ...baseProject(),
      id: 'project-2',
      name: 'New Project',
    })
    ipcServiceMock.generatePage.mockResolvedValue({
      ...baseProject(),
      pages: [
        {
          ...baseProject().pages[0],
          currentCode: '<html><body>Generated</body></html>',
        },
      ],
    })
    ipcServiceMock.savePageCode.mockResolvedValue(undefined)
    ipcServiceMock.saveSettings.mockResolvedValue(baseSettings)
    ipcServiceMock.exportCurrentPage.mockResolvedValue('/tmp/export/index.html')
    ipcServiceMock.exportProjectFiles.mockResolvedValue('/tmp/export/Landing Page')

    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    vi.stubGlobal('alert', vi.fn())
  })

  it('loads existing projects on startup', async () => {
    render(<App />)

    expect(await screen.findByText('Landing Page')).toBeInTheDocument()
    expect(ipcServiceMock.getProjects).toHaveBeenCalledTimes(1)
    expect(ipcServiceMock.getSettings).toHaveBeenCalledTimes(1)

    const codeEditor = await screen.findByDisplayValue('<html><body>Initial</body></html>')
    expect(codeEditor).toHaveValue('<html><body>Initial</body></html>')
  })

  it('creates a project from the new project action', async () => {
    render(<App />)

    await screen.findByText('Landing Page')
    await userEvent.click(screen.getByRole('button', { name: '新建项目' }))
    await userEvent.clear(screen.getByPlaceholderText('例如：营销落地页'))
    await userEvent.type(screen.getByPlaceholderText('例如：营销落地页'), 'New Project')
    await userEvent.click(screen.getByRole('button', { name: '创建项目' }))

    await waitFor(() => {
      expect(ipcServiceMock.createProject).toHaveBeenCalledWith({ name: 'New Project' })
    })
  })

  it('generates page code from the chat input', async () => {
    render(<App />)

    await screen.findByText('Landing Page')
    await userEvent.type(screen.getByPlaceholderText('描述你想要的页面...'), '做一个 pricing 页面')
    await userEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => {
      expect(ipcServiceMock.generatePage).toHaveBeenCalledWith('project-1', 'page-1', '做一个 pricing 页面', 'quality')
    })

    expect(await screen.findByDisplayValue('<html><body>Generated</body></html>')).toBeInTheDocument()
    expect(await screen.findByText(/页面已生成并保存，用时 .* 秒/)).toBeInTheDocument()
  })

  it('shows a readable error message when page generation fails', async () => {
    ipcServiceMock.generatePage.mockRejectedValueOnce(new Error('timed out'))

    render(<App />)

    await screen.findByText('Landing Page')
    await userEvent.type(screen.getByPlaceholderText('描述你想要的页面...'), '做一个 login 页面')
    await userEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => {
      expect(ipcServiceMock.generatePage).toHaveBeenCalledWith('project-1', 'page-1', '做一个 login 页面', 'quality')
    })

    expect(await screen.findByText('页面生成失败')).toBeInTheDocument()
    expect(await screen.findByText('请求超时，服务在限定时间内没有返回结果。')).toBeInTheDocument()
    expect(await screen.findByText('建议：你可以重试一次，或切换到更快的模型。')).toBeInTheDocument()
  })

  it('allows switching to fast mode before generation', async () => {
    render(<App />)

    await screen.findByText('Landing Page')
    await userEvent.click(screen.getByRole('button', { name: '快速模式' }))
    await userEvent.type(screen.getByPlaceholderText('描述你想要的页面...'), '做一个 dashboard')
    await userEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => {
      expect(ipcServiceMock.generatePage).toHaveBeenCalledWith('project-1', 'page-1', '做一个 dashboard', 'fast')
    })
    expect(ipcServiceMock.saveSettings).toHaveBeenCalledWith({
      ...baseSettings,
      generationMode: 'fast',
    })
  })

  it('uses persisted generation mode from settings on startup', async () => {
    ipcServiceMock.getSettings.mockResolvedValueOnce({
      ...baseSettings,
      generationMode: 'fast',
    })

    render(<App />)

    await screen.findByText('Landing Page')
    await userEvent.type(screen.getByPlaceholderText('描述你想要的页面...'), '做一个 analytics 页面')
    await userEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => {
      expect(ipcServiceMock.generatePage).toHaveBeenCalledWith('project-1', 'page-1', '做一个 analytics 页面', 'fast')
    })
  })

  it('saves edited code from the code panel', async () => {
    render(<App />)

    const codeEditor = await screen.findByDisplayValue('<html><body>Initial</body></html>')
    await userEvent.clear(codeEditor)
    await userEvent.type(codeEditor, '<html><body>Edited</body></html>')
    await userEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(ipcServiceMock.savePageCode).toHaveBeenCalledWith(
        'project-1',
        'page-1',
        '<html><body>Edited</body></html>',
      )
    })
  })

  it('opens settings modal and saves settings', async () => {
    render(<App />)

    await screen.findByText('Landing Page')
    await userEvent.click(screen.getByRole('button', { name: '设置' }))
    await userEvent.selectOptions(screen.getByDisplayValue('Claude'), 'openai')
    await userEvent.clear(screen.getByPlaceholderText('输入 API Key'))
    await userEvent.type(screen.getByPlaceholderText('输入 API Key'), 'sk-openai')
    await userEvent.click(screen.getByRole('button', { name: '保存设置' }))

    await waitFor(() => {
      expect(ipcServiceMock.saveSettings).toHaveBeenCalledWith({
        apiProvider: 'openai',
        apiKey: 'sk-openai',
        model: 'gpt-5.4',
        theme: 'light',
        generationMode: 'quality',
        defaultExportPath: '/tmp/export',
      })
    })
  })

  it('exports the current page through the export action', async () => {
    render(<App />)

    await screen.findByText('Landing Page')
    await userEvent.click(screen.getByRole('button', { name: '导出' }))
    await userEvent.clear(screen.getByRole('textbox', { name: '导出文件路径' }))
    await userEvent.type(screen.getByRole('textbox', { name: '导出文件路径' }), '/tmp/export/index.html')
    await userEvent.click(screen.getByRole('button', { name: '导出当前页面' }))

    await waitFor(() => {
      expect(ipcServiceMock.exportCurrentPage).toHaveBeenCalledWith(
        'project-1',
        'page-1',
        '/tmp/export/index.html',
      )
    })
  })

  it('exports the whole project through the export modal', async () => {
    render(<App />)

    await screen.findByText('Landing Page')
    await userEvent.click(screen.getByRole('button', { name: '导出' }))
    await userEvent.click(screen.getByRole('button', { name: /整个项目/ }))
    await userEvent.clear(screen.getByRole('textbox', { name: '导出目录' }))
    await userEvent.type(screen.getByRole('textbox', { name: '导出目录' }), '/tmp/final-export')
    await userEvent.click(screen.getByRole('button', { name: '导出整个项目' }))

    await waitFor(() => {
      expect(ipcServiceMock.exportProjectFiles).toHaveBeenCalledWith('project-1', '/tmp/final-export')
    })
  })

  it('validates export target before submitting', async () => {
    render(<App />)

    await screen.findByText('Landing Page')
    await userEvent.click(screen.getByRole('button', { name: '导出' }))
    await userEvent.clear(screen.getByRole('textbox', { name: '导出文件路径' }))
    await userEvent.click(screen.getByRole('button', { name: '导出当前页面' }))

    expect(await screen.findByText('请输入导出文件路径')).toBeInTheDocument()
    expect(ipcServiceMock.exportCurrentPage).not.toHaveBeenCalled()
  })
})
