import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import { Modal } from '@/components/shared/Common'

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [step, setStep] = useState<'email' | 'reset'>('email')

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setShowConfirmation(true)
      setTimeout(() => {
        setShowConfirmation(false)
        setStep('reset')
      }, 2000)
    }
  }

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary to-primary flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-slide-in-up">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-primary mb-6 font-semibold hover:gap-3 transition-all"
        >
          <ArrowLeft size={20} />
          Back to Login
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-poppins text-primary mb-2">Reset Password</h1>
          <p className="text-gray-600">
            {step === 'email'
              ? 'Enter your email to receive a reset link'
              : 'Create a new password'}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <div className="flex items-center gap-3 input-field">
                <Mail size={20} className="text-secondary" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="flex-1 bg-transparent outline-none"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full">
              Send Reset Link
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <input type="password" placeholder="••••••••" className="input-field" />
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input type="password" placeholder="••••••••" className="input-field" />
            </div>

            <button type="submit" className="btn-primary w-full">
              Reset Password
            </button>
          </form>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title="Check Your Email"
        actions={
          <button
            onClick={() => {
              setShowConfirmation(false)
              setStep('reset')
            }}
            className="btn-primary flex-1"
          >
            Continue
          </button>
        }
      >
        <p className="text-gray-600">
          We've sent a password reset link to <strong>{email}</strong>
        </p>
      </Modal>
    </div>
  )
}
