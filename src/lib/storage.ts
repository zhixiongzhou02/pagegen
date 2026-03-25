// File storage types matching Rust backend

export interface FileStorageConfig {
  basePath: string
}

// Storage operations will be called via Tauri IPC
export interface StorageOperations {
  saveProject: (project: Project) => Promise<void>
  loadProject: (projectId: string) => Promise<Project>
  loadAllProjects: () => Promise<Project[]>
  deleteProject: (projectId: string) => Promise<void>
  saveVersion: (projectId: string, versionId: string, code: string) => Promise<void>
  loadVersion: (projectId: string, versionId: string) => Promise<string>
}

// Re-export from main types
import type { Project, Page } from '../types'
export type { Project, Page }

// Storage error types
export type StorageError =
  | { type: 'ProjectNotFound'; id: string }
  | { type: 'VersionNotFound'; id: string }
  | { type: 'IoError'; message: string }
  | { type: 'SerializationError'; message: string }

export function isStorageError(error: unknown): error is StorageError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof (error as StorageError).type === 'string'
  )
}
