import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Brand label shown in pixel font (defaults to 'Tipiti') */
  brand?: string
  /** Main page title */
  title: string
  /** Optional badge text shown next to brand (e.g. 'Dashboard', 'Conta') */
  badge?: string
  /** Slot for right-side nav buttons / controls */
  actions?: ReactNode
  /** Optional extra content rendered below the title row (e.g. sub-buttons, sub-heading) */
  children?: ReactNode
}

export function PageHeader({ brand = 'Tipiti', title, badge, actions, children }: PageHeaderProps) {
  return (
    <header className="border-b-4 border-black pb-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="tipiti-pixel text-sm font-bold uppercase tracking-wider text-black">
            {brand}
          </p>
          {badge && (
            <span className="bg-black px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-[#F4F0EB]">
              {badge}
            </span>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <h1 className="mt-2 font-['Anton',Impact,'Arial_Black',sans-serif] text-3xl font-black uppercase tracking-tight text-black">
        {title}
      </h1>
      {children}
    </header>
  )
}
