'use client'

import { useState, useEffect } from 'react'
import { 
  RefreshCw, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  TrendingUp, 
  Star, 
  Users, 
  FileX,
  CheckCircle
} from 'lucide-react'

// Loading Spinner Component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  message = 'Loading...', 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <div className={`border border-gray-300 border-t-blue-600 rounded-full animate-spin ${sizeClasses[size]}`}></div>
      {message && (
        <span className="ml-3 text-gray-500">{message}</span>
      )}
    </div>
  )
}

// Error State Component
interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
  showIcon?: boolean
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading this content.',
  onRetry,
  retryLabel = 'Try Again',
  className = '',
  showIcon = true
}: ErrorStateProps) {
  return (
    <div className={`bg-white rounded-xl p-8 border border-red-200 text-center ${className}`}>
      {showIcon && (
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-red-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {retryLabel}
        </button>
      )}
    </div>
  )
}

// Empty State Component
interface EmptyStateProps {
  icon?: React.ReactNode
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title = 'No data available',
  description = 'There\'s nothing to show here yet.',
  action,
  className = ''
}: EmptyStateProps) {
  const defaultIcon = <FileX className="h-12 w-12 text-gray-400" />
  
  return (
    <div className={`bg-white rounded-xl p-8 border border-gray-200 text-center ${className}`}>
      <div className="mx-auto mb-4">
        {icon || defaultIcon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// Network Status Component
interface NetworkStatusProps {
  className?: string
  showWhenOnline?: boolean
}

export function NetworkStatus({ 
  className = '', 
  showWhenOnline = false 
}: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [showStatus, setShowStatus] = useState(false)

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)
      
      if (!online || showWhenOnline) {
        setShowStatus(true)
        // Auto-hide online status after 3 seconds
        if (online && showWhenOnline) {
          setTimeout(() => setShowStatus(false), 3000)
        }
      } else {
        setShowStatus(false)
      }
    }

    // Set initial status
    updateOnlineStatus()

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [showWhenOnline])

  if (!showStatus) return null

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className={`px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 ${
        isOnline 
          ? 'bg-green-600 text-white' 
          : 'bg-red-600 text-white'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span className="text-sm font-medium">Back online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">No internet connection</span>
          </>
        )}
      </div>
    </div>
  )
}

// Skeleton Loading Components
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl p-6 border border-gray-200 animate-pulse ${className}`}>
      <div className="h-6 bg-gray-200 rounded mb-4"></div>
      <div className="h-4 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 bg-gray-200 rounded mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
  )
}

export function StatCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl p-6 border border-gray-200 animate-pulse ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded mb-2 w-24"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="h-8 w-8 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

// Specific Empty States for Dashboard
export function EmptyIdeasState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyState
      icon={<TrendingUp className="h-12 w-12 text-gray-400" />}
      title="No trading ideas available"
      description="New ideas are generated daily. Check back soon!"
      action={onRefresh ? {
        label: 'Refresh',
        onClick: onRefresh
      } : undefined}
    />
  )
}

export function EmptyWatchlistState() {
  return (
    <EmptyState
      icon={<Star className="h-12 w-12 text-gray-400" />}
      title="No tickers in your watchlist"
      description="Click the + button next to any ticker in the trading ideas above to add them to your watchlist!"
    />
  )
}

export function EmptyActivityState() {
  return (
    <EmptyState
      icon={<Users className="h-12 w-12 text-gray-400" />}
      title="No recent activity"
      description="Start by viewing some trading ideas!"
    />
  )
}

// Success State Component
interface SuccessStateProps {
  title?: string
  message?: string
  onContinue?: () => void
  continueLabel?: string
  className?: string
}

export function SuccessState({
  title = 'Success!',
  message = 'The operation completed successfully.',
  onContinue,
  continueLabel = 'Continue',
  className = ''
}: SuccessStateProps) {
  return (
    <div className={`bg-white rounded-xl p-8 border border-green-200 text-center ${className}`}>
      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-green-600 mb-4">{message}</p>
      {onContinue && (
        <button
          onClick={onContinue}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          {continueLabel}
        </button>
      )}
    </div>
  )
}

// Loading States Hook for managing multiple loading states
export function useLoadingStates() {
  const [states, setStates] = useState<Record<string, boolean>>({})

  const setLoading = (key: string, loading: boolean) => {
    setStates(prev => ({ ...prev, [key]: loading }))
  }

  const isLoading = (key: string) => states[key] || false

  const isAnyLoading = () => Object.values(states).some(Boolean)

  return {
    setLoading,
    isLoading,
    isAnyLoading,
    states
  }
}
