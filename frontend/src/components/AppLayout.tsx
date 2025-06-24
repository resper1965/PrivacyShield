import React, { useState } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { 
  Upload, 
  FileText, 
  Shield, 
  Users, 
  AlertTriangle, 
  Menu, 
  X 
} from 'lucide-react';

const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Mapeamento de rotas para títulos
  const getPageTitle = (pathname: string): string => {
    const routes: Record<string, string> = {
      '/': 'Dashboard',
      '/files/upload': 'Upload de Arquivos',
      '/files/my-uploads': 'Meus Uploads',
      '/detections': 'Detecções',
      '/reports/titulares': 'Relatório de Titulares',
      '/incidents/create': 'Cadastrar Caso'
    };
    return routes[pathname] || 'n.crisis';
  };

  const navigationItems = [
    {
      name: 'Upload',
      href: '/files/upload',
      icon: Upload,
      description: 'Carregar arquivos para análise'
    },
    {
      name: 'Meus Uploads',
      href: '/files/my-uploads',
      icon: FileText,
      description: 'Histórico de uploads'
    },
    {
      name: 'Detecções',
      href: '/detections',
      icon: Shield,
      description: 'Dados PII detectados'
    },
    {
      name: 'Relatório Titulares',
      href: '/reports/titulares',
      icon: Users,
      description: 'Relatórios por titular'
    },
    {
      name: 'Cadastrar Caso',
      href: '/incidents/create',
      icon: AlertTriangle,
      description: 'Novo incidente de segurança'
    }
  ];

  return (
    <div 
      className="min-h-screen flex"
      style={{ 
        backgroundColor: '#0D1B2A',
        fontFamily: 'Montserrat, sans-serif',
        color: '#E0E1E6'
      }}
    >
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
        style={{ 
          backgroundColor: '#162332',
          borderRight: '1px solid #1e293b'
        }}
      >
        {/* Logo Header */}
        <div 
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: '#1e293b' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{ 
                backgroundColor: 'rgba(0, 173, 224, 0.1)',
                border: '1px solid rgba(0, 173, 224, 0.2)'
              }}
            >
              <Shield className="w-5 h-5" style={{ color: '#00ade0' }} />
            </div>
            <div>
              <h1 
                className="text-xl font-bold"
                style={{ color: '#E0E1E6' }}
              >
                n<span style={{ color: '#00ade0' }}>.</span>crisis
              </h1>
              <p 
                className="text-xs font-medium"
                style={{ color: '#94a3b8' }}
              >
                PII Detection & LGPD
              </p>
            </div>
          </div>
          
          {/* Botão fechar mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: '#94a3b8' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? '#00ade0' : 'transparent'
              })}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs opacity-75 truncate">
                  {item.description}
                </div>
              </div>
            </NavLink>
          ))}
        </nav>

        {/* Footer Status */}
        <div 
          className="p-4 border-t"
          style={{ borderColor: '#1e293b' }}
        >
          <div 
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ backgroundColor: '#1e293b' }}
          >
            <div 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: '#10b981' }} 
            />
            <div>
              <div 
                className="text-sm font-medium"
                style={{ color: '#E0E1E6' }}
              >
                Sistema Online
              </div>
              <div 
                className="text-xs"
                style={{ color: '#94a3b8' }}
              >
                Última atualização: agora
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header 
          className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b"
          style={{
            backgroundColor: '#162332',
            borderColor: '#1e293b'
          }}
        >
          <div className="flex items-center gap-4">
            {/* Menu button para mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: '#94a3b8' }}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div>
              <h1 
                className="text-2xl font-bold"
                style={{ color: '#E0E1E6' }}
              >
                {getPageTitle(location.pathname)}
              </h1>
              <p 
                className="text-sm"
                style={{ color: '#94a3b8' }}
              >
                {location.pathname}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#10b981' }}
            />
            <span 
              className="text-sm"
              style={{ color: '#94a3b8' }}
            >
              Operacional
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main 
          className="flex-1 p-6 overflow-auto"
          style={{ 
            backgroundColor: '#0D1B2A',
            minHeight: 'calc(100vh - 80px)'
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;