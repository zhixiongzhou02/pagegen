export interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  pages: Page[]
}

export interface Page {
  id: string
  name: string
  path: string
  currentCode: string
  versions: Version[]
}

export interface Version {
  id: string
  message: string
  timestamp: number
  codeSnapshot: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  metadata?: {
    action?: 'generate' | 'modify' | 'explain'
    targetElement?: string
  }
}

export interface AppSettings {
  apiProvider: 'claude' | 'openai'
  apiKey: string
  model: string
  theme: 'light' | 'dark' | 'system'
  defaultExportPath?: string
}

export interface CreateProjectRequest {
  name: string
}

export interface UpdateProjectRequest {
  id: string
  name: string
}
