import React, { useState } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';

const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Mapeamento de rotas para títulos
  const getPageTitle = (pathname: string): string => {
    const routes: Record<string, string> = {
      '/': 'Dashboard',
      '/files/upload': 'Upload',
      '/files/my-uploads': 'Meus Uploads',
      '/detections': 'Detecções',
      '/reports/titulares': 'Relatório Titulares',
      '/incidents/create': 'Cadastrar Caso'
    };
    return routes[pathname] || 'n.crisis';
  };

  const navigationItems = [
    { name: 'Upload', href: '/files/upload' },
    { name: 'Meus Uploads', href: '/files/my-uploads' },
    { name: 'Detecções', href: '/detections' },
    { name: 'Relatório Titulares', href: '/reports/titulares' },
    { name: 'Cadastrar Caso', href: '/incidents/create' }
  ];

  return (
    <div 
      className="min-h-screen flex"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - 240px fixa */}
      <div 
        className={`
          fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
        style={{ 
          width: '240px',
          backgroundColor: 'var(--color-surface)'
        }}
      >
        {/* Logo Header */}
        <div className="p-6">
          <h1 
            className="text-xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            n<span style={{ color: 'var(--color-primary)' }}>.</span>crisis
          </h1>
        </div>

        {/* Navigation - Lista simples sem ícones */}
        <nav className="flex-1 px-6 py-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'text-white' 
                        : 'hover:text-white'
                    }`
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                    color: isActive ? 'white' : 'var(--color-text-primary)',
                    borderBottom: isActive ? 'none' : '1px solid transparent'
                  })}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.classList.contains('active')) {
                      e.currentTarget.style.borderBottom = `1px solid var(--color-primary)`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.classList.contains('active')) {
                      e.currentTarget.style.borderBottom = '1px solid transparent';
                    }
                  }}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Botão fechar mobile */}
        <div className="lg:hidden p-4">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - altura 64px */}
        <header 
          className="sticky top-0 z-30 flex items-center justify-between px-6"
          style={{
            height: '64px',
            backgroundColor: 'var(--color-bg)',
            borderBottom: `1px solid var(--color-border)`
          }}
        >
          <div className="flex items-center gap-4">
            {/* Menu button para mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Título dinâmico */}
            <h1 
              className="text-xl font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {getPageTitle(location.pathname)}
            </h1>
          </div>

          {/* Avatar pequeno no canto direito */}
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: 'var(--color-surface)',
                border: `1px solid var(--color-border)`
              }}
            >
              <User 
                className="w-4 h-4" 
                style={{ color: 'var(--color-text-secondary)' }} 
              />
            </div>
          </div>
        </header>

        {/* Área de conteúdo */}
        <main 
          className="flex-1 overflow-auto"
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;