import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcService } from './ipc'

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'

describe('IPC Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Project commands', () => {
    it('should create project', async () => {
      const mockProject = {
        id: 'test-123',
        name: 'Test Project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pages: [],
      }
      vi.mocked(invoke).mockResolvedValueOnce(mockProject)

      const result = await ipcService.createProject({ name: 'Test Project' })

      expect(invoke).toHaveBeenCalledWith('create_project', {
        request: { name: 'Test Project' },
      })
      expect(result).toEqual(mockProject)
    })

    it('should get all projects', async () => {
      const mockProjects = [
        { id: '1', name: 'Project 1', createdAt: Date.now(), updatedAt: Date.now(), pages: [] },
        { id: '2', name: 'Project 2', createdAt: Date.now(), updatedAt: Date.now(), pages: [] },
      ]
      vi.mocked(invoke).mockResolvedValueOnce(mockProjects)

      const result = await ipcService.getProjects()

      expect(invoke).toHaveBeenCalledWith('get_projects')
      expect(result).toHaveLength(2)
    })

    it('should get single project', async () => {
      const mockProject = {
        id: 'test-123',
        name: 'Test Project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pages: [],
      }
      vi.mocked(invoke).mockResolvedValueOnce(mockProject)

      const result = await ipcService.getProject('test-123')

      expect(invoke).toHaveBeenCalledWith('get_project', { id: 'test-123' })
      expect(result.id).toBe('test-123')
    })

    it('should update project', async () => {
      const mockProject = {
        id: 'test-123',
        name: 'Updated Name',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pages: [],
      }
      vi.mocked(invoke).mockResolvedValueOnce(mockProject)

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

    it('should handle error when creating project', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Invalid project name'))

      await expect(ipcService.createProject({ name: '' })).rejects.toThrow('Invalid project name')
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
  })
})
