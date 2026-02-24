import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useDarkMode } from '@/hooks/useDarkMode'

export function AppLayout() {
  useDarkMode()

  return (
    <div className="h-screen flex bg-zinc-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="max-w-6xl mx-auto pt-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
