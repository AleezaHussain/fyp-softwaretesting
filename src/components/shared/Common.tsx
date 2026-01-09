import React, { useState, useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

export const Toast: React.FC<ToastProps> = ({ message, type, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), duration)
    return () => clearTimeout(timer)
  }, [duration])

  if (!isVisible) return null

  return (
    <div className={`toast toast-${type}`}>
      {message}
    </div>
  )
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} spinner`} />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  )
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({ isOpen, title, children, actions }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 animate-slide-in-up">
        <div className="p-6 border-b border-border-light">
          <h2 className="text-xl font-bold text-primary">{title}</h2>
        </div>
        <div className="p-6">
          {children}
        </div>
        {actions && <div className="p-6 border-t border-border-light flex gap-3">{actions}</div>}
      </div>
    </div>
  )
}

interface ProgressBarProps {
  progress: number
  label?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label }) => {
  return (
    <div className="w-full">
      {label && <p className="text-sm font-semibold text-dark-gray mb-2 font-poppins">{label}</p>}
      <div className="w-full h-2 bg-border-light rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-secondary to-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}%</p>
    </div>
  )
}

interface StepIndicatorProps {
  totalSteps: number
  currentStep: number
  steps: string[]
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, steps }) => {
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between mb-4">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 ${
              index < steps.length - 1 ? 'flex-1' : ''
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                index < currentStep
                  ? 'bg-secondary text-dark-gray font-bold'
                  : index === currentStep
                    ? 'bg-primary text-white border-2 border-primary'
                    : 'bg-border-light text-gray-500'
              }`}
            >
              {index < currentStep ? '✓' : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 rounded-full mx-2 ${
                  index < currentStep ? 'bg-secondary' : 'bg-border-light'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-600 font-medium">{steps[currentStep]}</p>
    </div>
  )
}
