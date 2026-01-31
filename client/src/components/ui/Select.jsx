import { ChevronDown } from 'lucide-react';

export function Select({
  label,
  error,
  options = [],
  placeholder = 'Select an option',
  className = '',
  wrapperClassName = '',
  required = false,
  ...props
}) {
  return (
    <div className={`space-y-2 ${wrapperClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-muted-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          className={`
            w-full px-4 py-3 rounded-lg
            bg-input text-foreground
            neu-input focus-ring
            appearance-none cursor-pointer
            ${error ? 'border-destructive' : ''}
            ${className}
          `}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          size={20}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive animate-slideIn">{error}</p>
      )}
    </div>
  );
}
