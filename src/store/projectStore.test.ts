import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from './projectStore'
import type { Project } from '../types'

const mockProject = (id: string, name: string): Project => ({
  id,
  name,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  pages: [],
})

describe('ProjectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [],
      currentProject: null,
      currentPage: null,
      isLoading: false,
      error: null,
    })
  })

  it('should initialize with empty projects', () => {
    const state = useProjectStore.getState()
    expect(state.projects).toEqual([])
    expect(state.currentProject).toBeNull()
  })

  it('should add a project', () => {
    const { addProject } = useProjectStore.getState()
    const project = mockProject('1', 'Test Project')

    addProject(project)

    const state = useProjectStore.getState()
    expect(state.projects).toHaveLength(1)
    expect(state.projects[0].name).toBe('Test Project')
  })

  it('should update a project', () => {
    const { addProject, updateProject } = useProjectStore.getState()
    const project = mockProject('1', 'Old Name')
    addProject(project)

    updateProject({ ...project, name: 'New Name' })

    const state = useProjectStore.getState()
    expect(state.projects[0].name).toBe('New Name')
  })

  it('should delete a project', () => {
    const { addProject, deleteProject } = useProjectStore.getState()
    addProject(mockProject('1', 'Project 1'))
    addProject(mockProject('2', 'Project 2'))

    deleteProject('1')

    const state = useProjectStore.getState()
    expect(state.projects).toHaveLength(1)
    expect(state.projects[0].id).toBe('2')
  })

  it('should clear currentProject when deleted project is current', () => {
    const { addProject, setCurrentProject, deleteProject } = useProjectStore.getState()
    const project = mockProject('1', 'Test')
    addProject(project)
    setCurrentProject(project)

    deleteProject('1')

    const state = useProjectStore.getState()
    expect(state.currentProject).toBeNull()
  })

  it('should set loading state', () => {
    const { setLoading } = useProjectStore.getState()

    setLoading(true)

    expect(useProjectStore.getState().isLoading).toBe(true)
  })

  it('should set error state', () => {
    const { setError } = useProjectStore.getState()

    setError({
      title: '操作失败',
      detail: 'Something went wrong',
      suggestion: '请稍后重试。',
    })

    expect(useProjectStore.getState().error).toEqual({
      title: '操作失败',
      detail: 'Something went wrong',
      suggestion: '请稍后重试。',
    })
  })
})
