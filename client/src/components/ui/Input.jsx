export function Input({
  label,
  error,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  wrapperClassName = '',
  required = false,
  ...props
}) {
  const hasIcon = !!Icon;

  return (
    <div className={`space-y-2 ${wrapperClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-muted-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {hasIcon && iconPosition === 'left' && (
          <Icon
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={20}
          />
        )}
        <input
          className={`
            w-full px-4 py-3 rounded-lg
            bg-input text-foreground placeholder-muted-foreground
            neu-input focus-ring
            ${hasIcon && iconPosition === 'left' ? 'pl-10' : ''}
            ${hasIcon && iconPosition === 'right' ? 'pr-10' : ''}
            ${error ? 'border-destructive' : ''}
            ${className}
          `}
          {...props}
        />
        {hasIcon && iconPosition === 'right' && (
          <Icon
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={20}
          />
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive animate-slideIn">{error}</p>
      )}
    </div>
  );
}
