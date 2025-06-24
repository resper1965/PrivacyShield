// frontend/src/components/AppLayout.tsx
import React, { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface AppLayoutProps {
  children: ReactNode
}

const menuItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/casos', label: 'Casos' },
  { path: '/arquivos', label: 'Arquivos' },
  { path: '/relatorio', label: 'Relatório' },
  { path: '/configuracao', label: 'Configuração' },
]

export function AppLayout({ children }: AppLayoutProps) {
  const { pathname } = useLocation()
  const current = menuItems.find(item => item.path === pathname)
  const title = current?.label || 'PII Detector'

  return (
    <div className="flex h-screen bg-[#0D1B2A] text-[#E0E1E6]">
      {/* Sidebar */}
      <nav className="w-60 bg-[#112240] p-4">
        <ul className="space-y-2">
          {menuItems.map(item => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`block px-3 py-2 rounded hover:underline hover:underline-offset-4
                  ${pathname === item.path ? 'underline decoration-2 decoration-[#00ade0]' : ''}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-[#0D1B2A] border-b border-[#1B263B] flex items-center px-6">
          <h1 className="text-2xl font-medium flex-1">{title}</h1>
          {/* Avatar placeholder */}
          <div className="w-8 h-8 bg-[#1B263B] rounded-full flex items-center justify-center">
            {/* você pode colocar img ou iniciais */}
            <span className="text-sm">US</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}