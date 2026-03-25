import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { useProjectStore } from './store/projectStore'
import type { AppSettings, Project } from './types'

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
  model: 'claude-3-5-sonnet-20241022',
  theme: 'light',
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
    vi.stubGlobal('prompt', vi.fn())
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
    vi.mocked(window.prompt).mockReturnValueOnce('New Project')

    render(<App />)

    await screen.findByText('Landing Page')
    await userEvent.click(screen.getByRole('button', { name: '新建项目' }))

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
      expect(ipcServiceMock.generatePage).toHaveBeenCalledWith('project-1', 'page-1', '做一个 pricing 页面')
    })

    expect(await screen.findByDisplayValue('<html><body>Generated</body></html>')).toBeInTheDocument()
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
        model: 'gpt-4-turbo',
        theme: 'light',
      })
    })
  })

  it('exports the current page through the export action', async () => {
    vi.mocked(window.prompt)
      .mockReturnValueOnce('page')
      .mockReturnValueOnce('/tmp/export/index.html')

    render(<App />)

    await screen.findByText('Landing Page')
    await userEvent.click(screen.getByRole('button', { name: '导出' }))

    await waitFor(() => {
      expect(ipcServiceMock.exportCurrentPage).toHaveBeenCalledWith(
        'project-1',
        'page-1',
        '/tmp/export/index.html',
      )
    })
  })
})
