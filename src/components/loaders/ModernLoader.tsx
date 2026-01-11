import React from 'react'

export const SkeletonLoader: React.FC<{ height?: string; width?: string; rounded?: string }> = ({
  height = 'h-4',
  width = 'w-full',
  rounded = 'rounded-lg',
}) => {
  return (
    <div className={`${width} ${height} ${rounded} bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse`}
      style={{
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s infinite',
      }}
    />
  )
}

export const CardSkeletonLoader: React.FC = () => {
  return (
    <div className="p-6 space-y-4">
      <SkeletonLoader height="h-6" width="w-3/4" />
      <SkeletonLoader height="h-4" width="w-full" />
      <SkeletonLoader height="h-4" width="w-5/6" />
      <div className="flex gap-2 pt-2">
        <SkeletonLoader height="h-10" width="w-24" rounded="rounded-full" />
        <SkeletonLoader height="h-10" width="w-24" rounded="rounded-full" />
      </div>
    </div>
  )
}

export const FormFieldSkeletonLoader: React.FC = () => {
  return (
    <div className="space-y-3">
      <SkeletonLoader height="h-4" width="w-32" rounded="rounded-md" />
      <SkeletonLoader height="h-12" width="w-full" rounded="rounded-lg" />
    </div>
  )
}

export const PulseLoader: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className={`${sizeClasses[size]} relative`}>
      <div className="absolute inset-0 bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] rounded-full animate-pulse" />
      <div className="absolute inset-1 bg-white rounded-full" />
    </div>
  )
}

export const ShimmerLoader: React.FC<{ className?: string }> = ({ className = 'h-64 w-full' }) => {
  return (
    <div className={`${className} relative overflow-hidden bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100`}
      style={{
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s infinite',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        style={{
          animation: 'slide 2s infinite',
        }}
      />
    </div>
  )
}

export const LoaderContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <style>{`
      @keyframes shimmer {
        0%, 100% {
          background-position: 200% 0;
        }
        50% {
          background-position: -200% 0;
        }
      }
      
      @keyframes slide {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }
      
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .animate-fade-in {
        animation: fadeIn 0.5s ease-out forwards;
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .animate-slide-up {
        animation: slideUp 0.6s ease-out forwards;
      }
      
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      .animate-scale-in {
        animation: scaleIn 0.4s ease-out forwards;
      }
    `}
    {children}
    </style>
  )
}
