export function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return (
    <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
      {error}
    </p>
  )
}
