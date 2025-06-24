import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';
  
  const variants = {
    default: 'bg-background-muted text-foreground',
    success: 'bg-success-bg text-success border border-success/20',
    warning: 'bg-warning-bg text-warning border border-warning/20', 
    error: 'bg-error-bg text-error border border-error/20',
    info: 'bg-info-bg text-info border border-info/20',
    outline: 'bg-transparent text-foreground border border-border'
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };
  
  const badgeStyles = {
    backgroundColor: variant === 'default' ? 'var(--background-muted)' :
                    variant === 'success' ? 'var(--success-bg)' :
                    variant === 'warning' ? 'var(--warning-bg)' :
                    variant === 'error' ? 'var(--error-bg)' :
                    variant === 'info' ? 'var(--info-bg)' :
                    'transparent',
    color: variant === 'default' ? 'var(--foreground)' :
           variant === 'success' ? 'var(--success)' :
           variant === 'warning' ? 'var(--warning)' :
           variant === 'error' ? 'var(--error)' :
           variant === 'info' ? 'var(--info)' :
           'var(--foreground)',
    borderColor: variant === 'outline' ? 'var(--border)' :
                variant === 'success' ? 'rgba(5, 150, 105, 0.2)' :
                variant === 'warning' ? 'rgba(217, 119, 6, 0.2)' :
                variant === 'error' ? 'rgba(220, 38, 38, 0.2)' :
                variant === 'info' ? 'rgba(37, 99, 235, 0.2)' :
                'transparent'
  };
  
  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      style={badgeStyles}
    >
      {children}
    </span>
  );
};

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'pending' | 'processing' | 'completed' | 'failed';
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
  className = ''
}) => {
  const statusConfig = {
    online: { label: 'Online', variant: 'success' as const },
    offline: { label: 'Offline', variant: 'error' as const },
    pending: { label: 'Pendente', variant: 'warning' as const },
    processing: { label: 'Processando', variant: 'info' as const },
    completed: { label: 'Concluído', variant: 'success' as const },
    failed: { label: 'Falhou', variant: 'error' as const }
  };
  
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant} size={size} className={`${className} flex items-center gap-1.5`}>
      {showDot && (
        <div 
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: config.variant === 'success' ? 'var(--success)' :
                           config.variant === 'error' ? 'var(--error)' :
                           config.variant === 'warning' ? 'var(--warning)' :
                           'var(--info)'
          }}
        />
      )}
      {config.label}
    </Badge>
  );
};