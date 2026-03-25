import { create } from 'zustand'
import { Project, Page } from '../types'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  currentPage: Page | null
  isLoading: boolean
  error: string | null
}

interface ProjectActions {
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (project: Project) => void
  deleteProject: (id: string) => void
  setCurrentProject: (project: Project | null) => void
  setCurrentPage: (page: Page | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useProjectStore = create<ProjectState & ProjectActions>((set) => ({
  projects: [],
  currentProject: null,
  currentPage: null,
  isLoading: false,
  error: null,

  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({
      projects: [...state.projects, project],
    })),

  updateProject: (project) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id ? project : p
      ),
    })),

  deleteProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject:
        state.currentProject?.id === id ? null : state.currentProject,
    })),

  setCurrentProject: (project) => set({ currentProject: project }),

  setCurrentPage: (page) => set({ currentPage: page }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),
}))
