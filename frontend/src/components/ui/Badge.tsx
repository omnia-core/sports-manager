interface BadgeProps {
  children: React.ReactNode
  variant?: 'blue' | 'green' | 'gray' | 'red' | 'yellow'
  className?: string
}

const variantClasses = {
  blue: 'bg-primary text-accent border border-secondary/30',
  green: 'bg-secondary/20 text-accent border border-secondary/40',
  gray: 'bg-white/10 text-foreground/60 border border-white/10',
  red: 'bg-red-900/50 text-red-300 border border-red-700/50',
  yellow: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50',
}

export default function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
