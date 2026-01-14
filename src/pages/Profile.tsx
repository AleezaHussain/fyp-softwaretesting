import React, { useState, useRef } from 'react'
import { Sidebar } from '../components/shared/Sidebar'
import { useAuthStore } from '../store/store'
import { useThemeStore } from '../hooks/useTheme'
import { 
  User as UserIcon, 
  Mail, 
  Bell, 
  Palette, 
  Lock, 
  Copy, 
  Check, 
  Shield, 
  Trash2, 
  Save, 
  Edit3,
  Key,
  AlertTriangle,
  Globe,
  Moon,
  Sun,
  Download,
  Upload,
  ChevronRight,
  Sparkles,
  Building,
  Briefcase,
  X,
  Camera,
  Image as ImageIcon
} from 'lucide-react'

// Define proper user type
interface UserPreferences {
  theme: 'light' | 'dark'
  units: 'metric' | 'imperial'
  notifications: boolean
}

interface User {
  name: string
  email: string
  organization?: string
  role?: string
  avatar?: string
  preferences?: UserPreferences
}

// Setting Card Component
const SettingCard: React.FC<{
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
}> = ({ title, description, icon, children }) => {
  const isDark = useThemeStore((state) => state.isDark)
  
  return (
    <div className={`rounded-2xl p-8 transition-all duration-300 ${
      isDark 
        ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
        : 'bg-gradient-to-b from-white to-gray-50 border border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${
            isDark ? 'bg-black/30' : 'bg-gray-100'
          }`}>
            {icon}
          </div>
          <div>
            <h3 className={`text-xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {title}
            </h3>
            <p className={`text-sm mt-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {description}
            </p>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}

// Theme Toggle Button
const ThemeToggle: React.FC<{
  currentTheme: 'light' | 'dark'
  onChange: (theme: 'light' | 'dark') => void
}> = ({ currentTheme, onChange }) => {
  const isDark = useThemeStore((state) => state.isDark)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  
  const handleThemeChange = (theme: 'light' | 'dark') => {
    onChange(theme)
    // Also update the global theme store
    if (theme === 'light' && isDark) {
      toggleTheme()
    } else if (theme === 'dark' && !isDark) {
      toggleTheme()
    }
  }
  
  return (
    <div className={`flex items-center p-1 rounded-xl ${
      isDark ? 'bg-[#27304a]' : 'bg-gray-100'
    }`}>
      <button
        onClick={() => handleThemeChange('light')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
          currentTheme === 'light'
            ? isDark
              ? 'bg-[#5ce1e5] text-white'
              : 'bg-[#0ea5e9] text-white'
            : isDark
              ? 'text-gray-400 hover:text-white'
              : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <Sun className="w-4 h-4" />
        Light
      </button>
      <button
        onClick={() => handleThemeChange('dark')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
          currentTheme === 'dark'
            ? isDark
              ? 'bg-[#fd5757] text-white'
              : 'bg-[#8b5cf6] text-white'
            : isDark
              ? 'text-gray-400 hover:text-white'
              : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <Moon className="w-4 h-4" />
        Dark
      </button>
    </div>
  )
}

// Unit Toggle Button
const UnitToggle: React.FC<{
  unit: 'metric' | 'imperial'
  onChange: (unit: 'metric' | 'imperial') => void
}> = ({ unit, onChange }) => {
  const isDark = useThemeStore((state) => state.isDark)
  
  return (
    <div className={`flex items-center p-1 rounded-xl ${
      isDark ? 'bg-[#27304a]' : 'bg-gray-100'
    }`}>
      <button
        onClick={() => onChange('metric')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
          unit === 'metric'
            ? isDark
              ? 'bg-[#10b981] text-white'
              : 'bg-[#10b981] text-white'
            : isDark
              ? 'text-gray-400 hover:text-white'
              : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <Globe className="w-4 h-4" />
        Metric
      </button>
      <button
        onClick={() => onChange('imperial')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
          unit === 'imperial'
            ? isDark
              ? 'bg-[#f59e0b] text-white'
              : 'bg-[#f59e0b] text-white'
            : isDark
              ? 'text-gray-400 hover:text-white'
              : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <Globe className="w-4 h-4" />
        Imperial
      </button>
    </div>
  )
}

// API Key Component
const ApiKeyField: React.FC<{
  value: string
  onCopy: () => void
  copied: boolean
}> = ({ value, onCopy, copied }) => {
  const isDark = useThemeStore((state) => state.isDark)
  const [showKey, setShowKey] = useState(false)
  
  return (
    <div className={`p-4 rounded-xl ${
      isDark ? 'bg-black/20' : 'bg-gray-100/50'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-medium ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          API Key
        </span>
        <button
          onClick={() => setShowKey(!showKey)}
          className={`text-xs px-2 py-1 rounded ${
            isDark 
              ? 'bg-[#27304a] text-gray-300 hover:text-white' 
              : 'bg-gray-200 text-gray-600 hover:text-gray-900'
          }`}
        >
          {showKey ? 'Hide' : 'Show'}
        </button>
      </div>
      
      <div className="flex items-center gap-2">
        <div className={`flex-1 font-mono px-4 py-3 rounded-lg ${
          isDark ? 'bg-[#27304a] text-gray-300' : 'bg-gray-200 text-gray-700'
        }`}>
          {showKey ? value : '••••••••••••••••••••••••••••••'}
        </div>
        <button
          onClick={onCopy}
          className={`p-3 rounded-lg transition-all duration-300 hover:scale-105 ${
            copied
              ? isDark
                ? 'bg-green-500/20 text-green-400'
                : 'bg-green-500/20 text-green-600'
              : isDark
                ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
          }`}
        >
          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )
}

// Upload Modal Component
const UploadModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onUpload: (file: File) => void
  isDark: boolean
  currentAvatar?: string
}> = ({ isOpen, onClose, onUpload, isDark, currentAvatar }) => {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        handleFile(file)
      }
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      handleFile(file)
    }
  }

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File size must be less than 5MB')
      return
    }

    setSelectedFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile)
      onClose()
    }
  }

  const handleRemove = () => {
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCameraClick = () => {
    // This would trigger camera access in a real app
    alert('Camera access would be requested here. For demo, please upload a file.')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-md rounded-3xl overflow-hidden ${
        isDark 
          ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
          : 'bg-gradient-to-b from-white to-gray-50 border border-gray-200'
      } shadow-2xl`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-800/50">
          <div className="flex items-center justify-between">
            <h3 className={`text-xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Upload Profile Picture
            </h3>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'hover:bg-[#27304a] text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className={`text-sm mt-1 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Upload a new profile picture (Max 5MB)
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current Avatar Preview */}
          <div className="mb-8 text-center">
            <h4 className={`text-sm font-medium mb-4 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Current Avatar
            </h4>
            <div className="relative inline-block">
              {currentAvatar ? (
                <img 
                  src={currentAvatar} 
                  alt="Current Avatar" 
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  isDark 
                    ? 'bg-gradient-to-br from-[#5ce1e5] to-[#fd5757]' 
                    : 'bg-gradient-to-br from-[#0ea5e9] to-[#5ce1e5]'
                }`}>
                  <UserIcon className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
              dragActive
                ? isDark
                  ? 'border-[#5ce1e5] bg-[#5ce1e5]/5'
                  : 'border-[#0ea5e9] bg-[#0ea5e9]/5'
                : isDark
                  ? 'border-[#3f4a68] hover:border-[#5ce1e5] bg-[#27304a]/50'
                  : 'border-gray-300 hover:border-[#0ea5e9] bg-gray-100/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
            
            <div className="space-y-4">
              {preview ? (
                <>
                  <div className="relative inline-block">
                    <img 
                      src={preview} 
                      alt="Preview" 
                      className="w-32 h-32 rounded-full object-cover mx-auto"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove()
                      }}
                      className={`absolute -top-2 -right-2 p-1.5 rounded-full ${
                        isDark 
                          ? 'bg-red-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className={`text-sm ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {selectedFile?.name} ({(selectedFile?.size! / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </>
              ) : (
                <>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                    isDark 
                      ? 'bg-[#27304a] text-[#5ce1e5]' 
                      : 'bg-gray-200 text-[#0ea5e9]'
                  }`}>
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <p className={`font-medium ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      Drop your image here, or{' '}
                      <span className={isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'}>
                        click to browse
                      </span>
                    </p>
                    <p className={`text-sm mt-1 ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Camera Option */}
          <div className="mt-6">
            <button
              onClick={handleCameraClick}
              className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
                isDark
                  ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <Camera className="w-5 h-5" />
              Take Photo with Camera
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className={`flex-1 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
                isDark
                  ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile}
              className={`flex-1 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
                selectedFile
                  ? isDark
                    ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white'
                    : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
                  : isDark
                    ? 'bg-[#27304a] text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Upload Photo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Profile: React.FC = () => {
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const isDark = useThemeStore((state) => state.isDark)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    organization: user?.organization || '',
    role: user?.role || ''
  })
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText('sk_test_abc123xyz789')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveProfile = () => {
    updateUser(formData)
  }

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleUploadPhoto = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 200)
    
    try {
      // In a real app, you would upload to your server here
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
      
      // Create a local URL for the uploaded image
      const imageUrl = URL.createObjectURL(file)
      
      // Update user with new avatar URL
      updateUser({ avatar: imageUrl })
      
      // In a real app, you would send the file to your server
      // and get back a URL from the server
      
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      clearInterval(interval)
    }
  }

  const handleRemovePhoto = () => {
    if (confirm('Are you sure you want to remove your profile picture?')) {
      updateUser({ avatar: undefined })
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Key }
  ]

  const stats = [
    { label: 'Simulations Run', value: '24', icon: Sparkles },
    { label: 'Projects', value: '5', icon: Download },
    { label: 'Reports Generated', value: '18', icon: Upload },
    { label: 'Days Active', value: '45', icon: Bell }
  ]

  // Get current theme from user preferences or default to current theme store
  const currentTheme = user?.preferences?.theme || (isDark ? 'dark' : 'light')
  const currentUnit = user?.preferences?.units || 'metric'
  const currentNotifications = user?.preferences?.notifications || false

  const handleThemeChange = (theme: 'light' | 'dark') => {
    updateUser({ 
      preferences: { 
        theme,
        units: currentUnit,
        notifications: currentNotifications
      } 
    })
  }

  const handleUnitChange = (units: 'metric' | 'imperial') => {
    updateUser({ 
      preferences: { 
        theme: currentTheme,
        units,
        notifications: currentNotifications
      } 
    })
  }

  const handleNotificationsChange = (notifications: boolean) => {
    updateUser({ 
      preferences: { 
        theme: currentTheme,
        units: currentUnit,
        notifications
      } 
    })
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      isDark 
        ? 'bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27]' 
        : 'bg-gradient-to-b from-slate-50 via-white to-slate-50'
    }`}>
      <Sidebar />

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUploadPhoto}
        isDark={isDark}
        currentAvatar={user?.avatar}
      />

      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl ${
          isDark ? 'bg-[#5ce1e5]/5' : 'bg-[#0ea5e9]/5'
        }`} style={{ animation: 'float 8s ease-in-out infinite' }} />
      </div>

      <main className="lg:ml-64 p-4 lg:p-8">
        {/* Header */}
        <div className="relative mb-8 lg:mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className={`text-3xl lg:text-4xl font-bold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Account <span className={isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'}>Settings</span>
              </h1>
              <p className={`text-lg ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Manage your profile, preferences, and security settings
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className={`flex items-center gap-4 px-4 py-3 rounded-xl ${
              isDark ? 'bg-[#1a1f3a] border border-[#3f4a68]' : 'bg-white border border-gray-200'
            }`}>
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className={`text-xl font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {stat.value}
                  </div>
                  <div className={`text-xs mt-1 ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className={`flex overflow-x-auto gap-1 p-1 rounded-xl ${
            isDark ? 'bg-[#1a1f3a]' : 'bg-gray-100'
          }`}>
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id
                      ? isDark
                        ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white'
                        : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
                      : isDark
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Sidebar */}
          <div className="space-y-8">
            {/* Profile Card */}
            <div className={`rounded-2xl p-8 text-center ${
              isDark 
                ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
                : 'bg-gradient-to-b from-white to-gray-50 border border-gray-200'
            }`}>
              <div className="relative inline-block mb-6 group">
                {/* Avatar Container */}
                <div className="relative">
                  {user?.avatar ? (
                    <>
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-24 h-24 rounded-full object-cover shadow-lg"
                      />
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 w-24 h-24 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${
                      isDark 
                        ? 'bg-gradient-to-br from-[#5ce1e5] to-[#fd5757]' 
                        : 'bg-gradient-to-br from-[#0ea5e9] to-[#5ce1e5]'
                    } shadow-lg`}>
                      <UserIcon className="w-12 h-12 text-white" />
                    </div>
                  )}
                  {/* Glow Effect */}
                  <div className={`absolute -inset-2 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300 ${
                    isDark 
                      ? 'bg-gradient-to-br from-[#5ce1e5] to-[#fd5757]' 
                      : 'bg-gradient-to-br from-[#0ea5e9] to-[#5ce1e5]'
                  }`} />
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-28">
                    <div className={`h-2 rounded-full overflow-hidden ${
                      isDark ? 'bg-[#27304a]' : 'bg-gray-200'
                    }`}>
                      <div 
                        className={`h-full transition-all duration-300 ${
                          isDark 
                            ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9]' 
                            : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5]'
                        }`}
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <h2 className={`text-2xl font-bold mb-1 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {user?.name}
              </h2>
              <div className={`flex items-center justify-center gap-2 mb-4 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <Mail className="w-4 h-4" />
                {user?.email}
              </div>
              
              <div className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 mb-6 ${
                isDark ? 'bg-[#27304a] text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm">Active Member</span>
              </div>
              
              {/* Photo Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowUploadModal(true)}
                  disabled={uploading}
                  className={`w-full py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white hover:from-[#4ad0d4] hover:to-[#0d99d9]'
                      : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white hover:from-[#0d99d9] hover:to-[#4ad0d4]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {uploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Uploading... {uploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        {user?.avatar ? 'Change Photo' : 'Upload Photo'}
                      </>
                    )}
                  </div>
                </button>
                
                {user?.avatar && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={uploading}
                    className={`w-full py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark
                        ? 'bg-[#27304a] text-red-400 hover:bg-red-500/10 hover:text-red-300'
                        : 'bg-gray-100 text-red-600 hover:bg-red-50 hover:text-red-700'
                    }`}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>

            {/* Account Type */}
            <div className={`rounded-2xl p-6 ${
              isDark 
                ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
                : 'bg-gradient-to-b from-white to-gray-50 border border-gray-200'
            }`}>
              <h3 className={`text-lg font-bold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Account Type
              </h3>
              
              <div className={`p-4 rounded-xl ${
                isDark ? 'bg-black/20' : 'bg-gray-100/50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Professional Plan
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    isDark ? 'bg-[#5ce1e5]/20 text-[#5ce1e5]' : 'bg-[#0ea5e9]/20 text-[#0ea5e9]'
                  }`}>
                    ACTIVE
                  </span>
                </div>
                <p className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Unlimited simulations • Advanced analytics • Priority support
                </p>
              </div>
              
              <button className={`w-full mt-4 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
                isDark
                  ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white'
                  : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
              }`}>
                <div className="flex items-center justify-center gap-2">
                  Upgrade Plan
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>
            </div>
          </div>

          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <SettingCard
                title="Profile Information"
                description="Update your personal details and contact information"
                icon={<UserIcon className="w-6 h-6" />}
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl transition-all ${
                          isDark
                            ? 'bg-[#27304a] text-white border border-[#3f4a68] focus:border-[#5ce1e5] focus:ring-2 focus:ring-[#5ce1e5]/20'
                            : 'bg-white text-gray-900 border border-gray-300 focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20'
                        }`}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Email Address
                      </label>
                      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                        isDark
                          ? 'bg-[#27304a] text-gray-300 border border-[#3f4a68]'
                          : 'bg-gray-100 text-gray-600 border border-gray-300'
                      }`}>
                        <Mail className="w-5 h-5" />
                        <span className="flex-1">{user?.email}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Organization
                        </div>
                      </label>
                      <input
                        type="text"
                        value={formData.organization}
                        onChange={(e) => handleFormChange('organization', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl transition-all ${
                          isDark
                            ? 'bg-[#27304a] text-white border border-[#3f4a68] focus:border-[#5ce1e5] focus:ring-2 focus:ring-[#5ce1e5]/20'
                            : 'bg-white text-gray-900 border border-gray-300 focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20'
                        }`}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          Role
                        </div>
                      </label>
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) => handleFormChange('role', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl transition-all ${
                          isDark
                            ? 'bg-[#27304a] text-white border border-[#3f4a68] focus:border-[#5ce1e5] focus:ring-2 focus:ring-[#5ce1e5]/20'
                            : 'bg-white text-gray-900 border border-gray-300 focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20'
                        }`}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-4 pt-4">
                    <button
                      onClick={() => setFormData({
                        name: user?.name || '',
                        email: user?.email || '',
                        organization: user?.organization || '',
                        role: user?.role || ''
                      })}
                      className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
                        isDark
                          ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
                        isDark
                          ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white'
                          : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Save className="w-5 h-5" />
                        Save Changes
                      </div>
                    </button>
                  </div>
                </div>
              </SettingCard>
            )}

            {/* Preferences */}
            {activeTab === 'preferences' && (
              <div className="space-y-8">
                <SettingCard
                  title="Display Preferences"
                  description="Customize your interface appearance and behavior"
                  icon={<Palette className="w-6 h-6" />}
                >
                  <div className="space-y-6">
                    <div>
                      <label className={`block text-sm font-medium mb-3 ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Theme
                      </label>
                      <ThemeToggle
                        currentTheme={currentTheme}
                        onChange={handleThemeChange}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-3 ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Measurement Units
                      </label>
                      <UnitToggle
                        unit={currentUnit}
                        onChange={handleUnitChange}
                      />
                    </div>
                    
                    <div className={`p-4 rounded-xl ${
                      isDark ? 'bg-black/20' : 'bg-gray-100/50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Bell className={`w-5 h-5 ${isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'}`} />
                          <div>
                            <div className={`font-medium ${
                              isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                              Email Notifications
                            </div>
                            <div className={`text-sm ${
                              isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Receive updates about your simulations
                            </div>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentNotifications}
                            onChange={(e) => handleNotificationsChange(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className={`w-12 h-6 rounded-full peer ${
                            isDark 
                              ? 'bg-[#3f4a68] peer-checked:bg-[#5ce1e5]' 
                              : 'bg-gray-300 peer-checked:bg-[#0ea5e9]'
                          } peer-focus:ring-2 peer-focus:ring-opacity-20 transition-colors duration-300`}>
                            <div className={`w-5 h-5 rounded-full transform transition-transform duration-300 ${
                              currentNotifications 
                                ? 'translate-x-7 bg-white' 
                                : 'translate-x-1 bg-white'
                            }`} />
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </SettingCard>
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div className="space-y-8">
                <SettingCard
                  title="Password Security"
                  description="Update your password and secure your account"
                  icon={<Lock className="w-6 h-6" />}
                >
                  <div className="space-y-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Current Password
                      </label>
                      <input
                        type="password"
                        className={`w-full px-4 py-3 rounded-xl transition-all ${
                          isDark
                            ? 'bg-[#27304a] text-white border border-[#3f4a68] focus:border-[#5ce1e5] focus:ring-2 focus:ring-[#5ce1e5]/20'
                            : 'bg-white text-gray-900 border border-gray-300 focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20'
                        }`}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          New Password
                        </label>
                        <input
                          type="password"
                          className={`w-full px-4 py-3 rounded-xl transition-all ${
                            isDark
                              ? 'bg-[#27304a] text-white border border-[#3f4a68] focus:border-[#5ce1e5] focus:ring-2 focus:ring-[#5ce1e5]/20'
                              : 'bg-white text-gray-900 border border-gray-300 focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          className={`w-full px-4 py-3 rounded-xl transition-all ${
                            isDark
                              ? 'bg-[#27304a] text-white border border-[#3f4a68] focus:border-[#5ce1e5] focus:ring-2 focus:ring-[#5ce1e5]/20'
                              : 'bg-white text-gray-900 border border-gray-300 focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20'
                          }`}
                        />
                      </div>
                    </div>
                    
                    <button className={`w-full py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
                      isDark
                        ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white'
                        : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
                    }`}>
                      Update Password
                    </button>
                  </div>
                </SettingCard>

                <SettingCard
                  title="API Keys"
                  description="Manage your API keys for integrations"
                  icon={<Key className="w-6 h-6" />}
                >
                  <div className="space-y-6">
                    <ApiKeyField
                      value="sk_test_abc123xyz789"
                      onCopy={handleCopyApiKey}
                      copied={copied}
                    />
                    
                    <div className={`p-4 rounded-xl ${
                      isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                        <div>
                          <div className={`font-bold mb-1 ${
                            isDark ? 'text-red-400' : 'text-red-600'
                          }`}>
                            ⚠️ Keep your API key secure
                          </div>
                          <div className={`text-sm ${
                            isDark ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            Never share your API key publicly. Regenerate immediately if exposed.
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button className={`w-full py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
                      isDark
                        ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                    }`}>
                      Regenerate API Key
                    </button>
                  </div>
                </SettingCard>
              </div>
            )}

            {/* Danger Zone */}
            <div className={`rounded-2xl p-8 ${
              isDark 
                ? 'bg-gradient-to-b from-red-900/20 to-red-900/10 border border-red-800/30' 
                : 'bg-gradient-to-b from-red-50 to-white border border-red-200'
            }`}>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    isDark ? 'bg-red-500/20' : 'bg-red-100'
                  }`}>
                    <AlertTriangle className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${
                      isDark ? 'text-white' : 'text-red-900'
                    }`}>
                      Danger Zone
                    </h3>
                    <p className={`text-sm mt-1 ${
                      isDark ? 'text-gray-400' : 'text-red-600'
                    }`}>
                      These actions are permanent and cannot be undone
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <button className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? 'bg-[#27304a] text-red-400 hover:bg-red-500/10 hover:text-red-300'
                    : 'bg-white text-red-600 hover:bg-red-50 hover:text-red-700'
                }`}>
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5" />
                    <div>
                      <div className="font-bold">Delete Account</div>
                      <div className={`text-sm ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Permanently delete your account and all data
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                <button className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? 'bg-[#27304a] text-orange-400 hover:bg-orange-500/10 hover:text-orange-300'
                    : 'bg-white text-orange-600 hover:bg-orange-50 hover:text-orange-700'
                }`}>
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5" />
                    <div>
                      <div className="font-bold">Export All Data</div>
                      <div className={`text-sm ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Download all your simulations and reports
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  )
}