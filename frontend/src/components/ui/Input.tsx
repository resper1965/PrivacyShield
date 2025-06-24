import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  disabled?: boolean;
  required?: boolean;
  error?: string;
  help?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  required = false,
  error,
  help,
  icon: Icon,
  iconPosition = 'left',
  size = 'md',
  className = '',
  fullWidth = true
}) => {
  const baseStyles = 'flex items-center border rounded-lg transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary';
  
  const sizes = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base'
  };
  
  const errorStyles = error ? 'border-error focus-within:border-error focus-within:ring-error/20' : 'border-border';
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed bg-background-muted' : 'bg-background hover:bg-background-elevated';
  const widthStyles = fullWidth ? 'w-full' : '';
  
  const inputStyles = {
    backgroundColor: disabled ? 'var(--background-muted)' : 'var(--background)',
    borderColor: error ? 'var(--error)' : 'var(--border)',
    color: 'var(--foreground)'
  };
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2" style={{ color: 'var(--foreground)' }}>
          {label}
          {required && <span className="text-error ml-1" style={{ color: 'var(--error)' }}>*</span>}
        </label>
      )}
      
      <div className={`${baseStyles} ${sizes[size]} ${errorStyles} ${disabledStyles} ${widthStyles} ${className}`}
           style={inputStyles}>
        {Icon && iconPosition === 'left' && (
          <Icon 
            size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} 
            className="ml-3 text-foreground-muted flex-shrink-0"
            style={{ color: 'var(--foreground-muted)' }}
          />
        )}
        
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          required={required}
          className="flex-1 bg-transparent border-none outline-none px-3 placeholder-foreground-subtle"
          style={{ 
            color: 'var(--foreground)',
            backgroundColor: 'transparent'
          }}
        />
        
        {Icon && iconPosition === 'right' && (
          <Icon 
            size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} 
            className="mr-3 text-foreground-muted flex-shrink-0"
            style={{ color: 'var(--foreground-muted)' }}
          />
        )}
      </div>
      
      {(error || help) && (
        <div className="mt-1 text-xs">
          {error && (
            <p className="text-error" style={{ color: 'var(--error)' }}>{error}</p>
          )}
          {help && !error && (
            <p className="text-foreground-subtle" style={{ color: 'var(--foreground-subtle)' }}>{help}</p>
          )}
        </div>
      )}
    </div>
  );
};

interface TextareaProps extends Omit<InputProps, 'type' | 'icon' | 'iconPosition'> {
  rows?: number;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  help,
  rows = 4,
  resize = 'vertical',
  className = '',
  fullWidth = true
}) => {
  const baseStyles = 'border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary p-3';
  const errorStyles = error ? 'border-error focus:border-error focus:ring-error/20' : 'border-border';
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed bg-background-muted' : 'bg-background hover:bg-background-elevated';
  const widthStyles = fullWidth ? 'w-full' : '';
  const resizeStyles = `resize-${resize}`;
  
  const textareaStyles = {
    backgroundColor: disabled ? 'var(--background-muted)' : 'var(--background)',
    borderColor: error ? 'var(--error)' : 'var(--border)',
    color: 'var(--foreground)'
  };
  
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2" style={{ color: 'var(--foreground)' }}>
          {label}
          {required && <span className="text-error ml-1" style={{ color: 'var(--error)' }}>*</span>}
        </label>
      )}
      
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        required={required}
        rows={rows}
        className={`${baseStyles} ${errorStyles} ${disabledStyles} ${widthStyles} ${resizeStyles} ${className} placeholder-foreground-subtle outline-none`}
        style={textareaStyles}
      />
      
      {(error || help) && (
        <div className="mt-1 text-xs">
          {error && (
            <p className="text-error" style={{ color: 'var(--error)' }}>{error}</p>
          )}
          {help && !error && (
            <p className="text-foreground-subtle" style={{ color: 'var(--foreground-subtle)' }}>{help}</p>
          )}
        </div>
      )}
    </div>
  );
};