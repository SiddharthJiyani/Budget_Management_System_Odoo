export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`neu-card p-8 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`mb-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h2 className={`text-2xl lg:text-3xl font-bold text-foreground ${className}`}>
      {children}
    </h2>
  );
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-muted-foreground mt-2 ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`mt-6 flex gap-3 ${className}`}>
      {children}
    </div>
  );
}
