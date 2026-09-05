import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { PixelMoon, PixelSun } from '@/features/shopping/PixelIcons'

export type Theme = 'dark' | 'light'

type ThemeContextType = {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 'tipiti-theme'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark'
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') return stored
    } catch {
      // ignore localStorage errors in restricted environments
    }
    // Default is dark mode per user request
    return 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    return {
      theme: 'dark' as Theme,
      toggleTheme: () => {},
      setTheme: () => {},
    }
  }
  return context
}

export function ThemeToggle({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`tipiti-button tipiti-button-sm cursor-pointer flex items-center gap-1.5 font-bold uppercase tracking-wider ${className}`}
      aria-label={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
      title={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
      data-testid="theme-toggle"
    >
      {isDark ? (
        <>
          <PixelSun width={14} height={14} />
          {!compact && <span>Claro</span>}
        </>
      ) : (
        <>
          <PixelMoon width={14} height={14} />
          {!compact && <span>Escuro</span>}
        </>
      )}
    </button>
  )
}
