import React, { useState } from 'react'
import { Menu, X, LogIn, Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useThemeStore } from '../../hooks/useTheme'

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const mode = useThemeStore((state) => state.mode)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const isDark = mode === 'dark'

  const navItems = [
    { label: 'Features', href: '#features' },
    { label: 'Impact', href: '#impact' },
    { label: 'Contact Us', href: '#contact' },
  ]

  return (
    <nav className={`fixed top-0 w-full z-50 border-b transition-colors duration-300 ${
      isDark
        ? 'bg-[#1a1f3a]/80 backdrop-blur-xl border-[#27304a]'
        : 'bg-white/80 backdrop-blur-xl border-gray-200/50'
    }`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className={`flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform`} onClick={() => navigate('/')}>
            <img src="/logo.svg" alt="COOLIENCE" className="w-24 h-24" />
            <span className={`text-2xl font-bold ${
              isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'
            }`}>
              COOLIENCE
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className={`hidden md:flex items-center gap-8 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`font-medium hover:text-${isDark ? '[#5ce1e5]' : '[#5ce1e5]'} transition-all`}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Auth Buttons & Theme Toggle */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all ${
                isDark
                  ? 'bg-[#27304a] hover:bg-[#3f4a68] text-[#5ce1e5]'
                  : 'bg-gray-100 hover:bg-gray-200 text-[#5ce1e5]'
              }`}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => navigate('/auth/login')}
              className={`px-4 py-2 font-semibold flex items-center gap-2 transition-colors ${
                isDark
                  ? 'text-gray-300 hover:text-[#5ce1e5]'
                  : 'text-gray-700 hover:text-[#5ce1e5]'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
            <button
              onClick={() => navigate('/auth/signup')}
              className={`px-6 py-2 font-semibold rounded-lg transition-all ${
                isDark
                  ? 'bg-[#fd5757] text-white hover:shadow-lg hover:shadow-[#fd5757]/50 hover:scale-105'
                  : 'bg-[#5ce1e5] text-white hover:shadow-lg hover:shadow-[#5ce1e5]/50 hover:scale-105'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden p-2 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-[#27304a] text-gray-300'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className={`md:hidden pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 ${
            isDark ? 'bg-[#1a1f3a]' : 'bg-white'
          }`}>
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  isDark
                    ? 'text-gray-300 hover:bg-[#27304a]'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </a>
            ))}
            <div className={`flex gap-2 pt-3 border-t ${isDark ? 'border-[#27304a]' : 'border-gray-200'}`}>
              <button
                onClick={() => navigate('/auth/login')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isDark
                    ? 'border-2 border-[#5ce1e5] text-[#5ce1e5] hover:bg-[#27304a]'
                    : 'border-2 border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => navigate('/auth/signup')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold text-white transition-all ${
                  isDark
                    ? 'bg-[#fd5757] hover:shadow-lg hover:shadow-[#fd5757]/50'
                    : 'bg-[#5ce1e5] hover:shadow-lg hover:shadow-[#5ce1e5]/50'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
