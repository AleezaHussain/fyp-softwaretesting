import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/store'
import { Mail, Lock, User, Wind, Zap, Shield, Eye, EyeOff, ChevronRight, Sparkles } from 'lucide-react'
import { useThemeStore } from '../../hooks/useTheme'

// AuthInput component (specific to SignUp file)
const AuthInput: React.FC<{
  icon: React.ElementType
  type: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  error?: string
  showPasswordToggle?: boolean
  onTogglePassword?: () => void
  showPassword?: boolean
}> = ({ 
  icon: Icon, 
  type, 
  name, 
  value, 
  onChange, 
  placeholder, 
  error,
  showPasswordToggle = false,
  onTogglePassword,
  showPassword = false
}) => {
  const isDark = useThemeStore((state) => state.isDark)
  
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 focus-within:scale-105 focus-within:shadow-lg ${
        error 
          ? isDark 
            ? 'border-red-500/50 bg-red-500/5' 
            : 'border-red-500 bg-red-50'
          : isDark
            ? 'border-[#3f4a68] bg-[#1a1f3a] focus-within:border-[#5ce1e5]'
            : 'border-gray-200 bg-white focus-within:border-[#0ea5e9]'
      }`}>
        <Icon className={`w-5 h-5 ${error ? 'text-red-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`} />
        <input
          type={showPasswordToggle && showPassword ? 'text' : type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`flex-1 bg-transparent outline-none text-base ${
            isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-500'
          }`}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'hover:bg-[#27304a]' : 'hover:bg-gray-100'
            }`}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 text-gray-500" />
            ) : (
              <Eye className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-sm flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}

export const SignUp: React.FC = () => {
  const navigate = useNavigate()
  const signup = useAuthStore((state) => state.signup)
  const isDark = useThemeStore((state) => state.isDark)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'
    if (!formData.password) newErrors.password = 'Password is required'
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters'
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) 
      newErrors.password = 'Password must contain uppercase, lowercase, and numbers'
    if (formData.password !== formData.confirmPassword) 
      newErrors.confirmPassword = 'Passwords do not match'
    if (!formData.acceptTerms) newErrors.acceptTerms = 'You must accept the terms'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    try {
      signup(formData.fullName, formData.email, formData.password)
      navigate('/dashboard')
    } catch (error) {
      setErrors({ submit: 'Registration failed. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 overflow-hidden ${
      isDark 
        ? 'bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27]' 
        : 'bg-gradient-to-br from-slate-50 via-white to-slate-50'
    }`}>
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Floating Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${
              isDark 
                ? 'bg-gradient-to-br from-[#5ce1e5]/10 to-[#fd5757]/10' 
                : 'bg-gradient-to-br from-[#0ea5e9]/10 to-[#ef4444]/10'
            }`}
            style={{
              width: `${40 + i * 10}px`,
              height: `${40 + i * 10}px`,
              left: `${10 + i * 5}%`,
              top: `${20 + i * 8}%`,
              animation: `float ${8 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`
            }}
          />
        ))}
        
        {/* Gradient Orbs */}
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl ${
          isDark ? 'bg-[#5ce1e5]/5' : 'bg-[#0ea5e9]/5'
        }`} style={{ animation: 'float 8s ease-in-out infinite' }} />
        <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl ${
          isDark ? 'bg-[#fd5757]/5' : 'bg-[#ef4444]/5'
        }`} style={{ animation: 'float 6s ease-in-out 2s infinite reverse' }} />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        {/* Left Side - Brand & Info */}
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-8 max-w-lg">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className={`flex items-center gap-3 px-4 py-2 rounded-full ${
                isDark ? 'bg-[#1a1f3a] border border-[#3f4a68]' : 'bg-white border border-gray-200'
              }`}>
                <div className={`p-2 rounded-lg ${
                  isDark ? 'bg-[#27304a]' : 'bg-gray-100'
                }`}>
                  <Sparkles className="w-5 h-5 text-[#5ce1e5]" />
                </div>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Join the Future of Cooling
                </span>
              </div>
              
              <h1 className={`text-5xl font-bold leading-tight ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Start Your{' '}
                <span className={`bg-gradient-to-r ${
                  isDark 
                    ? 'from-[#5ce1e5] to-[#fd5757]' 
                    : 'from-[#0ea5e9] to-[#5ce1e5]'
                } bg-clip-text text-transparent`}>
                  Cooling Journey
                </span>
              </h1>
              
              <p className={`text-lg ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Join thousands of data centers optimizing their cooling systems. 
                Save up to 40% on energy costs with our intelligent platform.
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-4">
              {[
                'AI-powered cooling optimization',
                'Real-time monitoring & alerts',
                'Detailed analytics & reporting',
                '24/7 expert support',
                'Scalable for any data center size'
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-green-500/20' : 'bg-green-100'
                  }`}>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="flex-1 max-w-md">
          <div className={`relative rounded-3xl overflow-hidden ${
            isDark 
              ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
              : 'bg-gradient-to-b from-white to-gray-50 border border-gray-200'
          } shadow-2xl`}>
            {/* Animated Border */}
            <div className="absolute inset-0 rounded-3xl p-1">
              <div className={`absolute inset-0 rounded-3xl ${
                isDark 
                  ? 'bg-gradient-to-r from-[#5ce1e5] via-[#fd5757] to-[#5ce1e5]' 
                  : 'bg-gradient-to-r from-[#0ea5e9] via-[#ef4444] to-[#0ea5e9]'
              } opacity-20`} style={{ 
                backgroundSize: '200% 100%',
                animation: 'gradientShift 3s ease-in-out infinite'
              }} />
            </div>

            <div className="relative p-8">
              {/* Header */}
              <div className="text-center mb-8 space-y-4">
                <div className="inline-block">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                    isDark 
                      ? 'bg-gradient-to-br from-[#5ce1e5] to-[#fd5757]' 
                      : 'bg-gradient-to-br from-[#0ea5e9] to-[#5ce1e5]'
                  }`}>
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className={`text-3xl font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Create Account
                  </h2>
                  <p className={`mt-1 ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Start optimizing your data center cooling
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {errors.submit && (
                  <div className={`p-4 rounded-xl ${
                    isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className="text-red-500 text-sm text-center">{errors.submit}</p>
                  </div>
                )}

                <AuthInput
                  icon={User}
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  error={errors.fullName}
                />

                <AuthInput
                  icon={Mail}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  error={errors.email}
                />

                <AuthInput
                  icon={Lock}
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  error={errors.password}
                  showPasswordToggle={true}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                />

                <AuthInput
                  icon={Lock}
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  error={errors.confirmPassword}
                  showPasswordToggle={true}
                  showPassword={showConfirmPassword}
                  onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                />

                {/* Password Requirements */}
                {formData.password && (
                  <div className={`p-4 rounded-xl ${
                    isDark ? 'bg-[#27304a]' : 'bg-gray-100'
                  }`}>
                    <div className={`text-sm font-medium mb-2 ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Password must contain:
                    </div>
                    <div className="space-y-1">
                      {[
                        { label: 'At least 8 characters', valid: formData.password.length >= 8 },
                        { label: 'One uppercase letter', valid: /[A-Z]/.test(formData.password) },
                        { label: 'One lowercase letter', valid: /[a-z]/.test(formData.password) },
                        { label: 'One number', valid: /\d/.test(formData.password) }
                      ].map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            req.valid 
                              ? isDark ? 'bg-green-500/20' : 'bg-green-100' 
                              : isDark ? 'bg-gray-700' : 'bg-gray-200'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              req.valid ? 'bg-green-500' : 'bg-transparent'
                            }`} />
                          </div>
                          <span className={`text-xs ${
                            req.valid 
                              ? isDark ? 'text-green-400' : 'text-green-600'
                              : isDark ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Terms & Conditions */}
                <div className={`flex items-start gap-3 p-4 rounded-xl ${
                  isDark ? 'bg-[#27304a]' : 'bg-gray-100'
                }`}>
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    id="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className={`mt-1 w-4 h-4 rounded focus:ring-0 ${
                      isDark 
                        ? 'bg-[#27304a] border-[#3f4a68] text-[#5ce1e5]' 
                        : 'bg-white border-gray-300 text-[#0ea5e9]'
                    }`}
                  />
                  <label htmlFor="acceptTerms" className={`text-sm ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    I agree to the{' '}
                    <a 
                      href="#" 
                      className={`font-medium ${
                        isDark ? 'text-[#5ce1e5] hover:text-[#5ce1e5]/80' : 'text-[#0ea5e9] hover:text-[#0ea5e9]/80'
                      } transition-colors`}
                    >
                      Terms & Conditions
                    </a>{' '}
                    and{' '}
                    <a 
                      href="#" 
                      className={`font-medium ${
                        isDark ? 'text-[#5ce1e5] hover:text-[#5ce1e5]/80' : 'text-[#0ea5e9] hover:text-[#0ea5e9]/80'
                      } transition-colors`}
                    >
                      Privacy Policy
                    </a>
                  </label>
                </div>
                {errors.acceptTerms && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <span>⚠</span> {errors.acceptTerms}
                  </p>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`group relative w-full py-4 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 overflow-hidden ${
                    isSubmitting
                      ? 'opacity-80 cursor-not-allowed'
                      : ''
                  } ${
                    isDark
                      ? 'bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white'
                      : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
                  }`}
                >
                  {/* Shine Effect */}
                  <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 transition-all duration-700 group-hover:left-full" />
                  
                  <span className="relative flex items-center justify-center gap-3">
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Divider */}
              <div className="my-6">
                <div className="relative">
                  <div className={`absolute inset-0 flex items-center ${
                    isDark ? 'border-[#3f4a68]' : 'border-gray-200'
                  }`}>
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className={`px-4 ${
                      isDark ? 'bg-[#1a1f3a] text-gray-400' : 'bg-white text-gray-500'
                    }`}>
                      Or sign up with
                    </span>
                  </div>
                </div>
              </div>

              {/* Social Signup */}
              <button className={`w-full py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
                isDark
                  ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
              }`}>
                <div className="flex items-center justify-center gap-3">
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  <span>Sign up with Google</span>
                </div>
              </button>

              {/* Login Link */}
              <p className={`text-center mt-6 text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  className={`font-medium ${
                    isDark ? 'text-[#5ce1e5] hover:text-[#5ce1e5]/80' : 'text-[#0ea5e9] hover:text-[#0ea5e9]/80'
                  } transition-colors`}
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  )
}