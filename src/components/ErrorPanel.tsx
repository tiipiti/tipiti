export function ErrorPanel({
  message = 'Ocorreu um erro.',
  onRetry,
  className = '',
}: {
  message?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={`tipiti-panel tipiti-panel-orange text-sm text-black ${className}`} role="alert">
      <p className="font-bold">{message}</p>
      {onRetry && (
        <button
          className="mt-2 font-bold underline cursor-pointer"
          type="button"
          onClick={onRetry}
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}
