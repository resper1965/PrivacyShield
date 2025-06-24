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
    label: 'Arquivos',
    icon: <FileText size={20} />,
    children: [
      { label: 'Enviar', path: '/files/upload', icon: <Upload size={16} /> },
      { label: 'Meus uploads', path: '/files/my-uploads', icon: <FileText size={16} /> }
    ]
  },
  {
    label: 'Jobs',
    icon: <Activity size={20} />,
    children: [
      { label: 'Fila em tempo real', path: '/jobs/queue', icon: <Activity size={16} /> },
      { label: 'Histórico', path: '/jobs/history', icon: <ScrollText size={16} /> }
    ]
  },
  {
    label: 'Detecções',
    path: '/detections',
    icon: <AlertTriangle size={20} />
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
            className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-colors ${
              parentActive
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
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
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          isActive(item.path!)
            ? 'bg-blue-600 text-white'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        {item.icon}
        {sidebarOpen && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              PIIDetector
            </h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
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
        className={`transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              PIIDetector - Sistema de Detecção de Dados Pessoais
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Sistema operacional
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};