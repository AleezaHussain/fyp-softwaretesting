import React from 'react'
import { LogOut, Home, BarChart3, FileText, User, Menu, X } from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/store'
import { useState } from 'react'

export const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/simulations', icon: BarChart3, label: 'Simulations' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/builder', icon: BarChart3, label: 'Builder' },
    { path: '/profile', icon: User, label: 'Profile' },
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-dark-gray text-white flex flex-col transition-transform duration-300 lg:translate-x-0 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-opacity-20 border-secondary space-y-3">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="COOLIENCE" className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold font-poppins">COOLience</h1>
              <p className="text-sm text-gray-400">Cooling Intelligence</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                isActive(path)
                  ? 'bg-secondary text-dark-gray font-semibold'
                  : 'text-gray-200 hover:bg-dark-gray hover:bg-opacity-50'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-opacity-20 border-secondary">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-200 hover:bg-dark-gray hover:bg-opacity-50 rounded-lg transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-30"
        />
      )}
    </>
  )
}
