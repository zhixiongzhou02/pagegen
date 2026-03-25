import { invoke } from '@tauri-apps/api/core'
import type { AppSettings, Project, Page, Version, CreateProjectRequest, UpdateProjectRequest } from '../types'

type BackendVersion = {
  id: string
  message: string
  timestamp: string | number
  code_snapshot: string
}

type BackendPage = {
  id: string
  name: string
  path: string
  current_code: string
  versions: BackendVersion[]
}

type BackendProject = {
  id: string
  name: string
  created_at: string | number
  updated_at: string | number
  pages: BackendPage[]
}

type BackendSettings = {
  api_provider: AppSettings['apiProvider']
  api_key: string
  model: string
  theme: AppSettings['theme']
  default_export_path?: string | null
}

function toTimestamp(value: string | number): number {
  if (typeof value === 'number') {
    return value
  }

  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? Date.now() : parsed
}

function normalizeVersion(version: BackendVersion): Version {
  return {
    id: version.id,
    message: version.message,
    timestamp: toTimestamp(version.timestamp),
    codeSnapshot: version.code_snapshot,
  }
}

function normalizePage(page: BackendPage): Page {
  return {
    id: page.id,
    name: page.name,
    path: page.path,
    currentCode: page.current_code,
    versions: page.versions.map(normalizeVersion),
  }
}

function normalizeProject(project: BackendProject): Project {
  return {
    id: project.id,
    name: project.name,
    createdAt: toTimestamp(project.created_at),
    updatedAt: toTimestamp(project.updated_at),
    pages: project.pages.map(normalizePage),
  }
}

function normalizeSettings(settings: BackendSettings): AppSettings {
  return {
    apiProvider: settings.api_provider,
    apiKey: settings.api_key,
    model: settings.model,
    theme: settings.theme,
    defaultExportPath: settings.default_export_path ?? undefined,
  }
}

function serializeSettings(settings: AppSettings): BackendSettings {
  return {
    api_provider: settings.apiProvider,
    api_key: settings.apiKey,
    model: settings.model,
    theme: settings.theme,
    default_export_path: settings.defaultExportPath ?? null,
  }
}

// IPC Service for calling Rust backend commands
export const ipcService = {
  // Project commands
  async createProject(request: CreateProjectRequest): Promise<Project> {
    const project = await invoke<BackendProject>('create_project', { request })
    return normalizeProject(project)
  },

  async getProjects(): Promise<Project[]> {
    const projects = await invoke<BackendProject[]>('get_projects')
    return projects.map(normalizeProject)
  },

  async getProject(id: string): Promise<Project> {
    const project = await invoke<BackendProject>('get_project', { id })
    return normalizeProject(project)
  },

  async updateProject(request: UpdateProjectRequest): Promise<Project> {
    const project = await invoke<BackendProject>('update_project', { request })
    return normalizeProject(project)
  },

  async deleteProject(id: string): Promise<void> {
    return invoke('delete_project', { id })
  },

  async generatePage(projectId: string, pageId: string, prompt: string): Promise<Project> {
    const project = await invoke<BackendProject>('generate_page', {
      projectId,
      pageId,
      prompt,
    })
    return normalizeProject(project)
  },

  // Page commands
  async savePageCode(projectId: string, pageId: string, code: string): Promise<void> {
    return invoke('save_page_code', { projectId, pageId, code })
  },

  // Version commands
  async saveVersion(projectId: string, versionId: string, code: string): Promise<void> {
    return invoke('save_version', { projectId, versionId, code })
  },

  async loadVersion(projectId: string, versionId: string): Promise<string> {
    return invoke('load_version', { projectId, versionId })
  },

  // Settings commands
  async getAppDir(): Promise<string> {
    return invoke('get_app_dir')
  },

  async getSettings(): Promise<AppSettings> {
    const settings = await invoke<BackendSettings>('get_settings')
    return normalizeSettings(settings)
  },

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    const saved = await invoke<BackendSettings>('save_settings', {
      settings: serializeSettings(settings),
    })
    return normalizeSettings(saved)
  },

  async exportCurrentPage(projectId: string, pageId: string, exportPath: string): Promise<string> {
    return invoke('export_current_page', {
      projectId,
      pageId,
      exportPath,
    })
  },

  async exportProjectFiles(projectId: string, exportDir: string): Promise<string> {
    return invoke('export_project_files', {
      projectId,
      exportDir,
    })
  },
} as const

// Type for the IPC service
type IpcService = typeof ipcService

export type { IpcService }
