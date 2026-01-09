import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/store'
import { Mail, Lock, User as UserIcon } from 'lucide-react'

export const SignUp: React.FC = () => {
  const navigate = useNavigate()
  const signup = useAuthStore((state) => state.signup)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.fullName) newErrors.fullName = 'Full name is required'
    if (!formData.email) newErrors.email = 'Email is required'
    if (!formData.password) newErrors.password = 'Password is required'
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match'
    if (!formData.acceptTerms) newErrors.acceptTerms = 'You must accept the terms'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      signup(formData.fullName, formData.email, formData.password)
      navigate('/dashboard')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  return (
    <div className="min-h-screen gradient-primary-secondary flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-slide-in-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-dark-gray mb-2 font-poppins">COOLience</h1>
          <p className="text-gray-600">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="label">Full Name</label>
            <div className="flex items-center gap-3 input-field">
              <UserIcon size={20} className="text-secondary" />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="John Doe"
                className="flex-1 bg-transparent outline-none"
              />
            </div>
            {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="label">Email Address</label>
            <div className="flex items-center gap-3 input-field">
              <Mail size={20} className="text-secondary" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="flex-1 bg-transparent outline-none"
              />
            </div>
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="label">Password</label>
            <div className="flex items-center gap-3 input-field">
              <Lock size={20} className="text-secondary" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="flex-1 bg-transparent outline-none"
              />
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="label">Confirm Password</label>
            <div className="flex items-center gap-3 input-field">
              <Lock size={20} className="text-secondary" />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="flex-1 bg-transparent outline-none"
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="flex items-start gap-3 p-3 bg-bg-light rounded-lg">
            <input
              type="checkbox"
              name="acceptTerms"
              id="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleChange}
              className="mt-1 w-4 h-4 accent-teal rounded"
            />
            <label htmlFor="acceptTerms" className="text-sm text-gray-600">
              I agree to the{' '}
              <a href="#" className="text-primary font-semibold hover:underline">
                Terms & Conditions
              </a>
            </label>
          </div>
          {errors.acceptTerms && <p className="text-red-500 text-sm">{errors.acceptTerms}</p>}

          {/* Submit Button */}
          <button type="submit" className="btn-primary w-full">
            Create Account
          </button>
        </form>

        {/* Social Sign Up */}
        <div className="mt-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-light"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <button className="w-full py-2 border border-border-light rounded-lg hover:bg-bg-light transition-all font-semibold text-primary">
            Sign Up with Google
          </button>
        </div>

        {/* Login Link */}
        <p className="text-center text-gray-600 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
