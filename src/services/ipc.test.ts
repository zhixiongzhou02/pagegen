import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BackendCommandError, ipcService } from './ipc'
import type { AppSettings } from '../types'

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'

const mockBackendProject = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'test-123',
  name: 'Test Project',
  created_at: '2026-03-25T00:00:00.000Z',
  updated_at: '2026-03-25T00:00:00.000Z',
  pages: [
    {
      id: 'page-1',
      name: 'index',
      path: 'index.html',
      current_code: '<html>Test</html>',
      versions: [],
    },
  ],
  ...overrides,
})

describe('IPC Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Project commands', () => {
    it('should create project', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(mockBackendProject())

      const result = await ipcService.createProject({ name: 'Test Project' })

      expect(invoke).toHaveBeenCalledWith('create_project', {
        request: { name: 'Test Project' },
      })
      expect(result).toMatchObject({
        id: 'test-123',
        name: 'Test Project',
        pages: [
          {
            id: 'page-1',
            currentCode: '<html>Test</html>',
          },
        ],
      })
    })

    it('should get all projects', async () => {
      const mockProjects = [
        mockBackendProject({ id: '1', name: 'Project 1' }),
        mockBackendProject({ id: '2', name: 'Project 2' }),
      ]
      vi.mocked(invoke).mockResolvedValueOnce(mockProjects)

      const result = await ipcService.getProjects()

      expect(invoke).toHaveBeenCalledWith('get_projects')
      expect(result).toHaveLength(2)
      expect(result[0].createdAt).toBeTypeOf('number')
    })

    it('should get single project', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(mockBackendProject())

      const result = await ipcService.getProject('test-123')

      expect(invoke).toHaveBeenCalledWith('get_project', { id: 'test-123' })
      expect(result.id).toBe('test-123')
      expect(result.pages[0].currentCode).toBe('<html>Test</html>')
    })

    it('should update project', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(
        mockBackendProject({ name: 'Updated Name' }),
      )

      const result = await ipcService.updateProject({ id: 'test-123', name: 'Updated Name' })

      expect(invoke).toHaveBeenCalledWith('update_project', {
        request: { id: 'test-123', name: 'Updated Name' },
      })
      expect(result.name).toBe('Updated Name')
    })

    it('should delete project', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined)

      await ipcService.deleteProject('test-123')

      expect(invoke).toHaveBeenCalledWith('delete_project', { id: 'test-123' })
    })

    it('should generate page for current project', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(mockBackendProject())

      const result = await ipcService.generatePage('test-123', 'page-1', '做一个定价页', 'quality')

      expect(invoke).toHaveBeenCalledWith('generate_page', {
        projectId: 'test-123',
        pageId: 'page-1',
        prompt: '做一个定价页',
        mode: 'quality',
      })
      expect(result.pages[0].currentCode).toBe('<html>Test</html>')
    })

    it('should handle error when creating project', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Invalid project name'))

      await expect(ipcService.createProject({ name: '' })).rejects.toThrow('Invalid project name')
    })

    it('should unwrap serialized backend error objects', async () => {
      vi.mocked(invoke).mockRejectedValueOnce({
        type: 'ApiError',
        message: '生成请求超时',
      })

      await expect(ipcService.generatePage('test-123', 'page-1', '做一个登录页', 'quality')).rejects.toThrow(
        '生成请求超时',
      )
    })

    it('should fall back to backend error type when message is missing', async () => {
      vi.mocked(invoke).mockRejectedValueOnce({
        type: 'InvalidApiKey',
      })

      await expect(ipcService.generatePage('test-123', 'page-1', '做一个登录页', 'quality')).rejects.toThrow(
        'InvalidApiKey',
      )
    })

    it('should preserve backend error code for frontend mapping', async () => {
      vi.mocked(invoke).mockRejectedValueOnce({
        type: 'InvalidApiKey',
        message: 'API key missing',
      })

      try {
        await ipcService.generatePage('test-123', 'page-1', '做一个登录页', 'quality')
      } catch (error) {
        expect(error).toBeInstanceOf(BackendCommandError)
        expect((error as BackendCommandError).code).toBe('InvalidApiKey')
      }
    })
  })

  describe('Page commands', () => {
    it('should save page code', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined)

      await ipcService.savePageCode('proj-123', 'page-456', '<html>Test</html>')

      expect(invoke).toHaveBeenCalledWith('save_page_code', {
        projectId: 'proj-123',
        pageId: 'page-456',
        code: '<html>Test</html>',
      })
    })
  })

  describe('Version commands', () => {
    it('should save version', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined)

      await ipcService.saveVersion('proj-123', 'v1', '<html>Version 1</html>')

      expect(invoke).toHaveBeenCalledWith('save_version', {
        projectId: 'proj-123',
        versionId: 'v1',
        code: '<html>Version 1</html>',
      })
    })

    it('should load version', async () => {
      vi.mocked(invoke).mockResolvedValueOnce('<html>Version 1</html>')

      const result = await ipcService.loadVersion('proj-123', 'v1')

      expect(invoke).toHaveBeenCalledWith('load_version', {
        projectId: 'proj-123',
        versionId: 'v1',
      })
      expect(result).toBe('<html>Version 1</html>')
    })
  })

  describe('Settings commands', () => {
    it('should get app directory', async () => {
      vi.mocked(invoke).mockResolvedValueOnce('/Users/test/Library/Application Support/PageGen')

      const result = await ipcService.getAppDir()

      expect(invoke).toHaveBeenCalledWith('get_app_dir')
      expect(result).toBe('/Users/test/Library/Application Support/PageGen')
    })

    it('should get settings', async () => {
      vi.mocked(invoke).mockResolvedValueOnce({
        api_provider: 'claude',
        api_key: 'sk-test',
        model: 'claude-sonnet-4-20250514',
        theme: 'dark',
        default_export_path: '/tmp/export',
        generation_mode: 'fast',
      })

      const result = await ipcService.getSettings()

      expect(invoke).toHaveBeenCalledWith('get_settings')
      expect(result).toEqual<AppSettings>({
        apiProvider: 'claude',
        apiKey: 'sk-test',
        model: 'claude-sonnet-4-20250514',
        theme: 'dark',
        defaultExportPath: '/tmp/export',
        generationMode: 'fast',
      })
    })

    it('should save settings', async () => {
      vi.mocked(invoke).mockResolvedValueOnce({
        api_provider: 'openai',
        api_key: 'sk-openai',
        model: 'gpt-4.1',
        theme: 'light',
        default_export_path: null,
        generation_mode: 'quality',
      })

      const result = await ipcService.saveSettings({
        apiProvider: 'openai',
        apiKey: 'sk-openai',
        model: 'gpt-4.1',
        theme: 'light',
        generationMode: 'quality',
      })

      expect(invoke).toHaveBeenCalledWith('save_settings', {
        settings: {
          api_provider: 'openai',
          api_key: 'sk-openai',
          model: 'gpt-4.1',
          theme: 'light',
          default_export_path: null,
          generation_mode: 'quality',
        },
      })
      expect(result.apiProvider).toBe('openai')
      expect(result.defaultExportPath).toBeUndefined()
    })

    it('should default generation mode to quality when backend omits it', async () => {
      vi.mocked(invoke).mockResolvedValueOnce({
        api_provider: 'claude',
        api_key: 'sk-test',
        model: 'claude-sonnet-4-20250514',
        theme: 'dark',
        default_export_path: null,
      })

      const result = await ipcService.getSettings()

      expect(result.generationMode).toBe('quality')
    })

    it('should export current page', async () => {
      vi.mocked(invoke).mockResolvedValueOnce('/tmp/export/index.html')

      const result = await ipcService.exportCurrentPage('project-1', 'page-1', '/tmp/export/index.html')

      expect(invoke).toHaveBeenCalledWith('export_current_page', {
        projectId: 'project-1',
        pageId: 'page-1',
        exportPath: '/tmp/export/index.html',
      })
      expect(result).toBe('/tmp/export/index.html')
    })

    it('should export project files', async () => {
      vi.mocked(invoke).mockResolvedValueOnce('/tmp/export/Project')

      const result = await ipcService.exportProjectFiles('project-1', '/tmp/export')

      expect(invoke).toHaveBeenCalledWith('export_project_files', {
        projectId: 'project-1',
        exportDir: '/tmp/export',
      })
      expect(result).toBe('/tmp/export/Project')
    })
  })
})
