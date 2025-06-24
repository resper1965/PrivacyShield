import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Shield, 
  Upload, 
  FileText, 
  Users, 
  Settings,
  AlertTriangle,
  BarChart3,
  Database,
  Lock
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    description: 'Visão geral do sistema'
  },
  {
    name: 'Upload de Arquivos',
    href: '/files/upload',
    icon: Upload,
    description: 'Carregar arquivos para análise'
  },
  {
    name: 'Detecções',
    href: '/detections',
    icon: Shield,
    description: 'Dados pessoais detectados'
  },
  {
    name: 'Relatórios',
    href: '/reports',
    icon: FileText,
    description: 'Relatórios de conformidade'
  },
  {
    name: 'Incidentes',
    href: '/incidents',
    icon: AlertTriangle,
    description: 'Gestão de incidentes'
  },
  {
    name: 'Organizações',
    href: '/organizations',
    icon: Users,
    description: 'Gestão de organizações'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Análise e métricas'
  },
  {
    name: 'Base de Dados',
    href: '/database',
    icon: Database,
    description: 'Gestão de dados'
  },
  {
    name: 'Configurações',
    href: '/settings',
    icon: Settings,
    description: 'Configurações do sistema'
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        bg-background-elevated border-r border-border flex flex-col
      `}
      style={{
        backgroundColor: 'var(--background-elevated)',
        borderColor: 'var(--border)'
      }}>
        
        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b border-border"
             style={{ borderColor: 'var(--border-muted)' }}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20">
            <Lock className="w-5 h-5 text-primary" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
              n<span style={{ color: 'var(--primary)' }}>.</span>crisis
            </h1>
            <p className="text-xs font-medium" style={{ color: 'var(--foreground-subtle)' }}>
              PII Detection & LGPD Compliance
            </p>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => `
                group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-foreground-muted hover:text-foreground hover:bg-background-muted'
                }
              `}
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? 'white' : 'var(--foreground-muted)'
              })}
              onClick={() => window.innerWidth < 1024 && onClose()}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{item.name}</div>
                <div className={`text-xs opacity-75 truncate`}>
                  {item.description}
                </div>
              </div>
            </NavLink>
          ))}
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-border"
             style={{ borderColor: 'var(--border-muted)' }}>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background-muted"
               style={{ backgroundColor: 'var(--background-muted)' }}>
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"
                 style={{ backgroundColor: 'var(--success)' }} />
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Sistema Operacional
              </div>
              <div className="text-xs" style={{ color: 'var(--foreground-subtle)' }}>
                Última atualização: agora
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};