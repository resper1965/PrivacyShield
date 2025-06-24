import React from 'react';
import { Menu, Bell, Search, User, Settings, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, sidebarOpen }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  
  return (
    <header 
      className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b"
      style={{
        backgroundColor: 'var(--background-elevated)',
        borderColor: 'var(--border)',
        fontFamily: 'Montserrat, sans-serif'
      }}
    >
      {/* Left section */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="lg:hidden"
          icon={Menu}
        />
        
        {/* Logo for mobile when sidebar is closed */}
        {!sidebarOpen && (
          <div className="lg:hidden flex items-center gap-2">
            <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
              n<span style={{ color: 'var(--primary)' }}>.</span>crisis
            </h1>
          </div>
        )}
        
        {/* Search */}
        <div className="hidden md:block w-96">
          <Input
            placeholder="Buscar detecções, arquivos, organizações..."
            value={searchQuery}
            onChange={setSearchQuery}
            icon={Search}
            size="sm"
          />
        </div>
      </div>
      
      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Search for mobile */}
        <Button
          variant="ghost"
          size="sm"
          icon={Search}
          className="md:hidden"
        />
        
        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            icon={Bell}
          />
          <Badge 
            variant="error" 
            size="sm" 
            className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 flex items-center justify-center p-0"
          >
            3
          </Badge>
        </div>
        
        {/* User menu */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"
                 style={{ backgroundColor: 'rgba(0, 173, 224, 0.2)' }}>
              <User className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Admin
              </div>
              <div className="text-xs" style={{ color: 'var(--foreground-subtle)' }}>
                admin@n.crisis
              </div>
            </div>
          </Button>
          
          {/* User dropdown */}
          {showUserMenu && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div 
                className="absolute right-0 top-full mt-2 w-48 bg-background-elevated border border-border rounded-lg shadow-xl z-50"
                style={{
                  backgroundColor: 'var(--background-elevated)',
                  borderColor: 'var(--border)'
                }}
              >
                <div className="p-2">
                  <button 
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-background-muted transition-colors"
                    style={{ color: 'var(--foreground)' }}
                  >
                    <Settings className="w-4 h-4" />
                    Configurações
                  </button>
                  <button 
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-background-muted transition-colors"
                    style={{ color: 'var(--foreground)' }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};