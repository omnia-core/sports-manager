interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export default function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground/70">
        {label}
      </label>
      <input
        id={inputId}
        className={`rounded-md border bg-primary px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-1 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-secondary/30 focus:border-secondary'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
