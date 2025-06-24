import React, { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, FileText, BarChart3, Settings, Menu, X, User } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { 
    path: '/dashboard', 
    label: 'Dashboard',
    icon: <LayoutDashboard size={20} />
  },
  { 
    path: '/casos', 
    label: 'Casos',
    icon: <AlertTriangle size={20} />
  },
  { 
    path: '/arquivos', 
    label: 'Arquivos',
    icon: <FileText size={20} />
  },
  { 
    path: '/relatorio', 
    label: 'Relatório',
    icon: <BarChart3 size={20} />
  },
  { 
    path: '/configuracao', 
    label: 'Configuração',
    icon: <Settings size={20} />
  },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const current = menuItems.find(item => item.path === pathname);
  const title = current?.label || 'n.crisis';

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col w-60`}
        style={{ 
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)'
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{ 
                backgroundColor: 'rgba(0, 173, 224, 0.1)',
                border: '1px solid rgba(0, 173, 224, 0.2)'
              }}
            >
              <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                n<span style={{ color: 'var(--color-primary)' }}>.</span>crisis
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                PII Detection & LGPD
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={pathname === item.path ? {
                backgroundColor: 'var(--color-primary)',
                color: 'white'
              } : {
                color: 'var(--color-text-primary)'
              }}
              onMouseEnter={(e) => {
                if (pathname !== item.path) {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 173, 224, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (pathname !== item.path) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Status */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div 
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ backgroundColor: 'var(--color-bg)' }}
          >
            <div 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: '#10b981' }} 
            />
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Sistema Online
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Operacional
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header 
          className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b"
          style={{
            backgroundColor: 'var(--color-bg)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)'
              }}
            >
              <User className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main 
          className="flex-1 overflow-auto p-6"
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}