import { ThemeToggle } from '@/lib/theme'

export function AppFooter({ className = '' }: { className?: string }) {
  return (
    <footer
      className={`mt-12 border-t-4 border-black pt-4 pb-6 flex items-center justify-between gap-4 text-xs font-bold uppercase ${className}`}
      data-testid="app-footer"
    >
      <div className="flex items-center gap-2">
        <span className="tipiti-pixel text-sm tracking-wider">Tipiti</span>
        <span className="text-[10px] bg-black text-[#F4F0EB] px-1.5 py-0.5">PWA</span>
      </div>
      <ThemeToggle />
    </footer>
  )
}
