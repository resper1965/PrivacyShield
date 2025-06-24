import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  fullWidth = false
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background';
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-600 focus:ring-primary shadow-sm',
    secondary: 'bg-background-surface text-foreground hover:bg-background-muted border border-border focus:ring-primary',
    outline: 'bg-transparent text-primary border border-primary hover:bg-primary/10 focus:ring-primary',
    ghost: 'bg-transparent text-foreground-muted hover:bg-background-muted hover:text-foreground focus:ring-primary',
    danger: 'bg-error text-white hover:bg-red-700 focus:ring-error shadow-sm'
  };
  
  const sizes = {
    sm: 'h-8 px-3 text-sm gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2',
    xl: 'h-14 px-8 text-lg gap-3'
  };
  
  const disabledStyles = disabled || loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';
  const widthStyles = fullWidth ? 'w-full' : '';
  
  const buttonStyles = {
    backgroundColor: variant === 'primary' ? 'var(--primary)' :
                    variant === 'secondary' ? 'var(--background-surface)' :
                    variant === 'outline' ? 'transparent' :
                    variant === 'ghost' ? 'transparent' :
                    variant === 'danger' ? 'var(--error)' : 'var(--primary)',
    borderColor: variant === 'outline' ? 'var(--primary)' :
                variant === 'secondary' ? 'var(--border)' : 'transparent',
    color: variant === 'primary' || variant === 'danger' ? 'white' :
           variant === 'outline' ? 'var(--primary)' :
           variant === 'ghost' ? 'var(--foreground-muted)' : 'var(--foreground)'
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabledStyles} ${widthStyles} ${className}`}
      style={buttonStyles}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      
      {!loading && Icon && iconPosition === 'left' && (
        <Icon size={size === 'sm' ? 14 : size === 'md' ? 16 : size === 'lg' ? 18 : 20} />
      )}
      
      {!loading && children}
      
      {!loading && Icon && iconPosition === 'right' && (
        <Icon size={size === 'sm' ? 14 : size === 'md' ? 16 : size === 'lg' ? 18 : 20} />
      )}
    </button>
  );
};