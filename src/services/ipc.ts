import { invoke } from '@tauri-apps/api/core'
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '../types'

// IPC Service for calling Rust backend commands
export const ipcService = {
  // Project commands
  async createProject(request: CreateProjectRequest): Promise<Project> {
    return invoke('create_project', { request })
  },

  async getProjects(): Promise<Project[]> {
    return invoke('get_projects')
  },

  async getProject(id: string): Promise<Project> {
    return invoke('get_project', { id })
  },

  async updateProject(request: UpdateProjectRequest): Promise<Project> {
    return invoke('update_project', { request })
  },

  async deleteProject(id: string): Promise<void> {
    return invoke('delete_project', { id })
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
} as const

// Type for the IPC service
type IpcService = typeof ipcService

export type { IpcService }
