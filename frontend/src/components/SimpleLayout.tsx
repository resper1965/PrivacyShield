import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface SimpleLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/incidentes', label: 'Incidentes' },
  { path: '/arquivos', label: 'Arquivos' },
  { path: '/processamento', label: 'Processamento' },
  { path: '/relatorio', label: 'Relatório' },
  { path: '/configuracao', label: 'Configuração' },
];

export const SimpleLayout: React.FC<SimpleLayoutProps> = ({ children }) => {
  const location = useLocation();
  const currentPage = menuItems.find(item => item.path === location.pathname);
  const title = currentPage?.label || 'n.crisis';

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Montserrat, sans-serif' }}>
      {/* Sidebar */}
      <nav style={{ 
        width: '240px', 
        backgroundColor: '#112240', 
        color: '#E0E1E6',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Logo */}
        <div style={{ height: '64px', padding: '0 24px', borderBottom: '1px solid #1B263B', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
            n<span style={{ color: '#00ade0' }}>.</span>crisis
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#A5A8B1' }}>
            PII Detection & LGPD
          </p>
        </div>

        {/* Menu */}
        <div style={{ padding: '16px', flex: 1 }}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'block',
                padding: '12px 16px',
                margin: '4px 0',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
                color: isActive ? 'white' : '#E0E1E6',
                backgroundColor: isActive ? '#00ade0' : 'transparent',
                border: isActive ? 'none' : `1px solid transparent`,
                borderBottom: isActive ? 'none' : `1px solid ${location.pathname === item.path ? '#00ade0' : 'transparent'}`
              })}
              onMouseEnter={(e) => {
                const target = e.target as HTMLElement;
                if (!target.style.backgroundColor.includes('rgb(0, 173, 224)')) {
                  target.style.borderBottom = '1px solid #00ade0';
                }
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLElement;
                if (!target.style.backgroundColor.includes('rgb(0, 173, 224)')) {
                  target.style.borderBottom = '1px solid transparent';
                }
              }}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0D1B2A' }}>
        {/* Header */}
        <header style={{
          height: '64px',
          backgroundColor: '#0D1B2A',
          borderBottom: '1px solid #1B263B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          color: '#E0E1E6'
        }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
            {title}
          </h1>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#112240',
            border: '1px solid #1B263B',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: '#A5A8B1'
          }}>
            US
          </div>
        </header>

        {/* Page Content */}
        <main style={{
          flex: 1,
          padding: '24px',
          backgroundColor: '#0D1B2A',
          color: '#E0E1E6',
          overflow: 'auto'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
};