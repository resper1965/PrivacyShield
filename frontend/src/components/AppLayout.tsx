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
    <div 
      style={{ 
        display: 'flex', 
        minHeight: '100vh',
        backgroundColor: '#0D1B2A',
        color: '#E0E1E6',
        fontFamily: 'Montserrat, sans-serif'
      }}
    >
      {/* Sidebar */}
      <nav 
        style={{ 
          width: '240px',
          backgroundColor: '#112240',
          borderRight: '1px solid #1B263B',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Logo */}
        <div style={{ padding: '24px', borderBottom: '1px solid #1B263B' }}>
          <h1 style={{ 
            fontSize: '20px', 
            fontWeight: 'bold',
            color: '#E0E1E6',
            margin: 0
          }}>
            n<span style={{ color: '#00ade0' }}>.</span>crisis
          </h1>
          <p style={{ 
            fontSize: '12px',
            color: '#A5A8B1',
            margin: '4px 0 0 0'
          }}>
            PII Detection & LGPD
          </p>
        </div>

        {/* Menu */}
        <div style={{ flex: 1, padding: '16px' }}>
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
                color: isActive ? 'white' : '#E0E1E6',
                backgroundColor: isActive ? '#00ade0' : 'transparent',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.style.backgroundColor.includes('rgb(0, 173, 224)')) {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 173, 224, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.style.backgroundColor.includes('rgb(0, 173, 224)')) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Status */}
        <div style={{ 
          padding: '16px',
          borderTop: '1px solid #1B263B'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            backgroundColor: '#0D1B2A',
            borderRadius: '8px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#E0E1E6' }}>
                Sistema Online
              </div>
              <div style={{ fontSize: '12px', color: '#A5A8B1' }}>
                Operacional
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{
          height: '64px',
          backgroundColor: '#0D1B2A',
          borderBottom: '1px solid #1B263B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px'
        }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '600',
            color: '#E0E1E6',
            margin: 0
          }}>
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
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '12px', color: '#A5A8B1' }}>US</span>
          </div>
        </header>

        {/* Content */}
        <main style={{
          flex: 1,
          padding: '24px',
          backgroundColor: '#0D1B2A',
          overflow: 'auto'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}