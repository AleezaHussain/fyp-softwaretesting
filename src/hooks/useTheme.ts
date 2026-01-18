import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  isDark: boolean
  toggleTheme: () => void
  setTheme: (mode: ThemeMode) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      isDark: false,
      toggleTheme: () =>
        set((state) => {
          const newMode = state.mode === 'light' ? 'dark' : 'light'
          return {
            mode: newMode,
            isDark: newMode === 'dark',
          }
        }),
      setTheme: (mode: ThemeMode) =>
        set({
          mode,
          isDark: mode === 'dark',
        }),
    }),
    {
      name: 'theme-storage',
    }
  )
)
