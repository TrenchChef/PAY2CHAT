'use client';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const sizeStyles = {
    sm: { width: '16px', height: '16px' },
    md: { width: '24px', height: '24px' },
    lg: { width: '32px', height: '32px' },
  };

  return (
    <div
      className={`animate-spin rounded-full border-b-2 border-current ${sizeClasses[size]} ${className}`}
      style={{
        border: '2px solid transparent',
        borderBottomColor: '#FFFFFF',
        borderRadius: '50%',
        display: 'inline-block',
        ...sizeStyles[size]
      }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

