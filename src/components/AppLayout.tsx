import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ProjectProvider } from '../hooks/useProject'
import { ProjectSelector } from './ProjectSelector'

export function AppLayout() {
  return (
    <ProjectProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative">
          <div style={{
            position: 'sticky', top: 0, zIndex: 20,
            display: 'flex', justifyContent: 'flex-end',
            padding: '16px 32px 0',
            pointerEvents: 'none',
          }}>
            <div style={{ pointerEvents: 'auto' }}>
              <ProjectSelector />
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </ProjectProvider>
  )
}
