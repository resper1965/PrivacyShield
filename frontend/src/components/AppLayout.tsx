import React, { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface AppLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/casos', label: 'Casos' },
  { path: '/arquivos', label: 'Arquivos' },
  { path: '/relatorio', label: 'Relatório' },
  { path: '/configuracao', label: 'Configuração' },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const current = menuItems.find(item => item.path === location.pathname);
  const title = current?.label || 'n.crisis';

  return (
    <div className="flex h-screen bg-[#0D1B2A] text-[#E0E1E6]">
      {/* Sidebar */}
      <nav className="w-60 bg-[#112240] border-r border-[#1B263B] flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[#1B263B]">
          <h1 className="text-xl font-bold text-[#E0E1E6] m-0">
            n<span className="text-[#00ade0]">.</span>crisis
          </h1>
          <p className="text-xs text-[#A5A8B1] mt-1">
            PII Detection & LGPD
          </p>
        </div>

        {/* Menu */}
        <div className="flex-1 p-4">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block px-4 py-3 my-1 rounded-lg text-sm font-medium transition-all duration-200 no-underline ${
                  isActive 
                    ? 'bg-[#00ade0] text-white' 
                    : 'text-[#E0E1E6] hover:bg-[rgba(0,173,224,0.1)]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Status */}
        <div className="p-4 border-t border-[#1B263B]">
          <div className="flex items-center gap-3 p-3 bg-[#0D1B2A] rounded-lg">
            <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
            <div>
              <div className="text-sm font-medium text-[#E0E1E6]">
                Sistema Online
              </div>
              <div className="text-xs text-[#A5A8B1]">
                Operacional
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-[#0D1B2A] border-b border-[#1B263B] flex items-center justify-between px-6">
          <h1 className="text-2xl font-semibold text-[#E0E1E6] m-0">
            {title}
          </h1>
          
          <div className="w-8 h-8 bg-[#112240] border border-[#1B263B] rounded-full flex items-center justify-center">
            <span className="text-xs text-[#A5A8B1]">US</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 bg-[#0D1B2A] overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}