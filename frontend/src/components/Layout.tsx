import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Upload, FileText, Activity, AlertTriangle,
  BarChart3, FolderOpen, Settings, Regex, Users, Database,
  ScrollText, ChevronDown, ChevronRight, Menu, X
} from 'lucide-react';

interface MenuItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard size={20} />
  },
  {
    label: 'Casos',
    path: '/casos',
    icon: <AlertTriangle size={20} />
  },
  {
    label: 'Arquivos',
    path: '/arquivos',
    icon: <FileText size={20} />
  },
  {
    label: 'Relatório',
    path: '/relatorio',
    icon: <BarChart3 size={20} />
  },
  {
    label: 'Configuração',
    path: '/configuracao',
    icon: <Settings size={20} />
  },
  {
    label: 'Relatórios',
    icon: <BarChart3 size={20} />,
    children: [
      { label: 'LGPD Consolidado', path: '/reports/lgpd', icon: <BarChart3 size={16} /> },
      { label: 'Por Titular', path: '/reports/titulares', icon: <Users size={16} /> },
      { label: 'Por Organização', path: '/reports/organizations', icon: <Database size={16} /> },
      { label: 'Incidentes & Falsos-positivos', path: '/reports/incidents', icon: <AlertTriangle size={16} /> }
    ]
  },
  {
    label: 'Fontes de Diretório',
    path: '/sources',
    icon: <FolderOpen size={20} />
  },
  {
    label: 'Padrões Regex (PII)',
    path: '/patterns',
    icon: <Regex size={20} />
  },
  {
    label: 'Configurações',
    path: '/settings',
    icon: <Settings size={20} />
  },
  {
    label: 'Administração',
    icon: <Users size={20} />,
    children: [
      { label: 'Usuários', path: '/admin/users', icon: <Users size={16} /> },
      { label: 'Variáveis de Ambiente', path: '/admin/environment', icon: <Settings size={16} /> },
      { label: 'Logs & Auditoria', path: '/admin/logs', icon: <ScrollText size={16} /> }
    ]
  }
];

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Arquivos', 'Jobs', 'Relatórios', 'Administração']);
  const location = useLocation();

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (children: MenuItem[]) => 
    children.some(child => child.path && isActive(child.path));

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.label);
    const parentActive = hasChildren && isParentActive(item.children!);

    if (hasChildren) {
      return (
        <div key={item.label} className="mb-1">
          <button
            onClick={() => toggleExpanded(item.label)}
            className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-colors"
            style={{
              backgroundColor: parentActive ? 'rgba(0, 173, 224, 0.2)' : 'transparent',
              color: parentActive ? 'var(--color-primary)' : 'var(--color-text-primary)'
            }}
            onMouseEnter={(e) => {
              if (!parentActive) {
                e.currentTarget.style.backgroundColor = 'var(--color-border)';
              }
            }}
            onMouseLeave={(e) => {
              if (!parentActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </div>
            {sidebarOpen && (
              isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            )}
          </button>
          {isExpanded && sidebarOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children!.map(child => renderMenuItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.label}
        to={item.path!}
        className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
        style={{
          backgroundColor: isActive(item.path!) ? 'var(--color-primary)' : 'transparent',
          color: isActive(item.path!) ? 'var(--color-background)' : 'var(--color-text-primary)'
        }}
        onMouseEnter={(e) => {
          if (!isActive(item.path!)) {
            e.currentTarget.style.backgroundColor = 'var(--color-border)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive(item.path!)) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {item.icon}
        {sidebarOpen && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="app-container" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
        style={{ 
          backgroundColor: 'var(--color-surface)', 
          borderRight: '1px solid var(--color-border)' 
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          {sidebarOpen && (
            <h1 className="text-h3" style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>
              <span style={{ color: 'var(--color-primary)' }}>PII</span>Detector
            </h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg transition-colors"
            style={{ 
              color: 'var(--color-text-secondary)',
              ':hover': { backgroundColor: 'var(--color-border)' }
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-border)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>
      </div>

      {/* Main content */}
      <div
        className={`main-content transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        {/* Top bar */}
        <header 
          className="px-6 py-4"
          style={{ 
            backgroundColor: 'var(--color-surface)', 
            borderBottom: '1px solid var(--color-border)',
            height: '64px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-bold" style={{ 
              color: 'var(--color-text-primary)',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '700'
            }}>
              n<span style={{ color: 'var(--color-primary)' }}>.</span>crisis
            </h2>
            <div className="flex items-center gap-4">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: 'var(--color-success)' }}
              ></div>
              <span className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
                Sistema operacional
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main 
          className="p-6"
          style={{ 
            backgroundColor: 'var(--color-background)',
            minHeight: 'calc(100vh - 64px)'
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};