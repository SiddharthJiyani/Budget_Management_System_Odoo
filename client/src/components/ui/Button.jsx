import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'default',
  isLoading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus-ring disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90 neu-button',
    secondary: 'bg-secondary text-secondary-foreground hover:opacity-90 neu-button',
    outline: 'border border-input bg-card hover:bg-muted neu-card',
    ghost: 'hover:bg-muted hover:text-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90 neu-button',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin" size={18} />}
      {children}
    </button>
  );
}
