import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outline' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  onClick,
  hover = false
}) => {
  const baseStyles = 'rounded-xl transition-all duration-200';
  
  const variants = {
    default: 'bg-background-elevated border border-border',
    elevated: 'bg-background-elevated border border-border shadow-lg',
    outline: 'bg-transparent border border-border',
    ghost: 'bg-transparent'
  };
  
  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };
  
  const hoverStyles = hover || onClick ? 'hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5' : '';
  const clickableStyles = onClick ? 'cursor-pointer' : '';
  
  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${hoverStyles} ${clickableStyles} ${className}`}
      onClick={onClick}
      style={{
        backgroundColor: variant === 'default' || variant === 'elevated' ? 'var(--background-elevated)' : 
                        variant === 'outline' ? 'transparent' : 'transparent',
        borderColor: 'var(--border)',
        color: 'var(--foreground)'
      }}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => (
  <div className={`flex items-center justify-between pb-4 border-b border-border mb-4 ${className}`}
       style={{ borderColor: 'var(--border-muted)' }}>
    {children}
  </div>
);

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '', size = 'md' }) => {
  const sizes = {
    sm: 'text-lg font-semibold',
    md: 'text-xl font-semibold', 
    lg: 'text-2xl font-bold'
  };
  
  return (
    <h3 className={`${sizes[size]} text-foreground ${className}`}
        style={{ color: 'var(--foreground)' }}>
      {children}
    </h3>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);