import { useEffect, useState, createContext, useContext, ReactNode, createElement } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Project } from '../types'

const STORAGE_KEY = 'tls.activeProjectId'

interface ProjectContextValue {
  projects: Project[]
  activeProject: Project | null
  setActiveProject: (p: Project | null) => void
  loading: boolean
  refresh: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextValue>({
  projects: [], activeProject: null, setActiveProject: () => {}, loading: true, refresh: async () => {},
})

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { profile, user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProjectState] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!user) { setProjects([]); setActiveProjectState(null); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('projects').select('*').order('name')
    const list = (data as Project[]) ?? []
    setProjects(list)

    if (profile?.role === 'admin') {
      const savedId = localStorage.getItem(STORAGE_KEY)
      const found = list.find(p => p.id === savedId) || list[0] || null
      setActiveProjectState(found)
    } else if (profile?.project_id) {
      setActiveProjectState(list.find(p => p.id === profile.project_id) || null)
    } else {
      setActiveProjectState(null)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [profile?.id, profile?.role, profile?.project_id])

  function setActiveProject(p: Project | null) {
    setActiveProjectState(p)
    if (p) localStorage.setItem(STORAGE_KEY, p.id)
    else localStorage.removeItem(STORAGE_KEY)
  }

  return createElement(
    ProjectContext.Provider,
    { value: { projects, activeProject, setActiveProject, loading, refresh: load } },
    children
  )
}

export const useProject = () => useContext(ProjectContext)
