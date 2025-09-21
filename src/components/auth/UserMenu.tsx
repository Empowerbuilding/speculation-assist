'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { User, ChevronDown, Settings, LogOut, CreditCard, Bell } from 'lucide-react'
import Link from 'next/link'

export function UserMenu() {
  const { user, profile, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  console.log('UserMenu - User:', user?.id, 'Profile:', profile?.id)

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {profile?.avatar_url ? (
          <img 
            src={profile.avatar_url} 
            alt={profile.display_name || profile.email}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-600 to-red-600 flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
        )}
        <span className="text-sm font-medium text-gray-700">
          {profile?.display_name || profile?.first_name || user.user_metadata?.first_name || user.email}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => {
              console.log('Backdrop clicked, closing dropdown')
              setIsOpen(false)
            }}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-4 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                {profile?.display_name || (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}`.trim() : null) || user.user_metadata?.first_name || user.email}
              </p>
              <p className="text-sm text-gray-500">{profile?.email || user.email}</p>
              <div className="mt-2">
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                  profile?.subscription_status === 'premium' 
                    ? 'bg-green-100 text-green-800' 
                    : profile?.subscription_status === 'trial'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {profile?.subscription_status?.toUpperCase() || 'FREE'}
                </span>
              </div>
            </div>
            
            <div className="py-2">
              <Link 
                href="/dashboard"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  console.log('Navigating to dashboard')
                  setIsOpen(false)
                }}
              >
                <User className="h-4 w-4 mr-3" />
                Dashboard
              </Link>
              <Link 
                href="/settings"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  console.log('Navigating to settings')
                  setIsOpen(false)
                }}
              >
                <Settings className="h-4 w-4 mr-3" />
                Settings
              </Link>
              <button
                className="flex items-center w-full px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                disabled
              >
                <CreditCard className="h-4 w-4 mr-3" />
                Subscription (Coming Soon)
              </button>
              <button
                className="flex items-center w-full px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                disabled
              >
                <Bell className="h-4 w-4 mr-3" />
                Notifications (Coming Soon)
              </button>
              <button
                onClick={() => {
                  console.log('Signing out...')
                  signOut()
                  setIsOpen(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}