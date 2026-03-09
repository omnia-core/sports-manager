import Spinner from './Spinner'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  isLoading?: boolean
  children: React.ReactNode
}

const variantClasses = {
  primary:
    'bg-secondary text-background hover:bg-accent focus-visible:ring-secondary disabled:opacity-50',
  secondary:
    'bg-primary text-foreground border border-secondary/30 hover:border-secondary focus-visible:ring-secondary disabled:opacity-50',
  danger:
    'bg-red-900/50 text-red-300 border border-red-700 hover:bg-red-900 focus-visible:ring-red-700 disabled:opacity-50',
}

export default function Button({
  variant = 'primary',
  isLoading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
