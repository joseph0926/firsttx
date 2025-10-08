import { motion } from 'motion/react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`${sizeClasses[size]} border-current border-t-transparent rounded-full ${className}`}
    />
  );
}

interface ButtonSpinnerProps {
  children: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
}

export function ButtonWithSpinner({
  children,
  isLoading = false,
  loadingText,
}: ButtonSpinnerProps) {
  return (
    <span className="flex items-center justify-center gap-2">
      {isLoading && <LoadingSpinner size="sm" />}
      {isLoading && loadingText ? loadingText : children}
    </span>
  );
}
