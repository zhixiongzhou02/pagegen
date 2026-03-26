import { invoke } from '@tauri-apps/api/core'
import type { AppSettings, Project, Page, Version, CreateProjectRequest, UpdateProjectRequest, GenerationMode } from '../types'

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
  generation_mode?: GenerationMode | null
}

type SerializedBackendError = {
  type?: string
  message?: string
}

export class BackendCommandError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'BackendCommandError'
    this.code = code
  }
}

function toBackendError(error: unknown): BackendCommandError {
  if (error instanceof BackendCommandError) {
    return error
  }

  if (error instanceof Error && error.message) {
    return new BackendCommandError(error.message)
  }

  if (typeof error === 'string') {
    return new BackendCommandError(error)
  }

  if (typeof error === 'object' && error !== null) {
    const serialized = error as SerializedBackendError
    const message = typeof serialized.message === 'string' && serialized.message.trim()
      ? serialized.message
      : typeof serialized.type === 'string' && serialized.type.trim()
        ? serialized.type
        : '发生未知错误'
    const code = typeof serialized.type === 'string' && serialized.type.trim()
      ? serialized.type
      : undefined

    return new BackendCommandError(message, code)
  }

  return new BackendCommandError('发生未知错误')
}

async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    if (args === undefined) {
      return await invoke<T>(command)
    }

    return await invoke<T>(command, args)
  } catch (error) {
    throw toBackendError(error)
  }
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
    generationMode: settings.generation_mode ?? 'quality',
  }
}

function serializeSettings(settings: AppSettings): BackendSettings {
  return {
    api_provider: settings.apiProvider,
    api_key: settings.apiKey,
    model: settings.model,
    theme: settings.theme,
    default_export_path: settings.defaultExportPath ?? null,
    generation_mode: settings.generationMode,
  }
}

// IPC Service for calling Rust backend commands
export const ipcService = {
  // Project commands
  async createProject(request: CreateProjectRequest): Promise<Project> {
    const project = await invokeCommand<BackendProject>('create_project', { request })
    return normalizeProject(project)
  },

  async getProjects(): Promise<Project[]> {
    const projects = await invokeCommand<BackendProject[]>('get_projects')
    return projects.map(normalizeProject)
  },

  async getProject(id: string): Promise<Project> {
    const project = await invokeCommand<BackendProject>('get_project', { id })
    return normalizeProject(project)
  },

  async updateProject(request: UpdateProjectRequest): Promise<Project> {
    const project = await invokeCommand<BackendProject>('update_project', { request })
    return normalizeProject(project)
  },

  async deleteProject(id: string): Promise<void> {
    return invokeCommand('delete_project', { id })
  },

  async generatePage(projectId: string, pageId: string, prompt: string, mode: GenerationMode): Promise<Project> {
    const project = await invokeCommand<BackendProject>('generate_page', {
      projectId,
      pageId,
      prompt,
      mode,
    })
    return normalizeProject(project)
  },

  // Page commands
  async savePageCode(projectId: string, pageId: string, code: string): Promise<void> {
    return invokeCommand('save_page_code', { projectId, pageId, code })
  },

  // Version commands
  async saveVersion(projectId: string, versionId: string, code: string): Promise<void> {
    return invokeCommand('save_version', { projectId, versionId, code })
  },

  async loadVersion(projectId: string, versionId: string): Promise<string> {
    return invokeCommand('load_version', { projectId, versionId })
  },

  // Settings commands
  async getAppDir(): Promise<string> {
    return invokeCommand('get_app_dir')
  },

  async getSettings(): Promise<AppSettings> {
    const settings = await invokeCommand<BackendSettings>('get_settings')
    return normalizeSettings(settings)
  },

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    const saved = await invokeCommand<BackendSettings>('save_settings', {
      settings: serializeSettings(settings),
    })
    return normalizeSettings(saved)
  },

  async exportCurrentPage(projectId: string, pageId: string, exportPath: string): Promise<string> {
    return invokeCommand('export_current_page', {
      projectId,
      pageId,
      exportPath,
    })
  },

  async exportProjectFiles(projectId: string, exportDir: string): Promise<string> {
    return invokeCommand('export_project_files', {
      projectId,
      exportDir,
    })
  },
} as const

// Type for the IPC service
type IpcService = typeof ipcService

export type { IpcService }
