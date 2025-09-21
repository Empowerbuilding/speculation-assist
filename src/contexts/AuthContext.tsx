'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient, clearStoredAuthData, clearStaleSessionsOnServerRestart } from '@/lib/supabase-client'

interface UserProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  display_name?: string
  avatar_url?: string
  subscription_status: 'free' | 'premium' | 'trial'
  subscription_expires_at?: string
  is_newsletter_subscribed: boolean
  preferences: {
    email_notifications: boolean
    push_notifications: boolean
    marketing_emails: boolean
    daily_digest: boolean
  }
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  
  const supabase = createClient()

  const fetchUserProfile = async (userId: string) => {
    console.log('🔍 Fetching profile for user ID:', userId)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      console.log('📊 Profile query result:', { data, error })

      if (error) {
        console.error('❌ Error fetching user profile:', error)
        console.log('Error code:', error.code, 'Error message:', error.message)
        // Don't sign out user if profile doesn't exist - they might be new
        // Just return null and let the app handle it
        return null
      }

      console.log('✅ Profile fetched successfully:', data)
      return data as UserProfile
    } catch (error) {
      console.error('💥 Exception fetching user profile:', error)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await fetchUserProfile(user.id)
      setProfile(userProfile)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      clearStoredAuthData()
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setSession(null)
    } catch (error) {
      console.error('Error signing out:', error)
      // Clear stored data even if signOut fails
      clearStoredAuthData()
      setUser(null)
      setProfile(null)
      setSession(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    let initTimeoutId: NodeJS.Timeout | null = null
    
    // Clear stale sessions on potential server restart
    clearStaleSessionsOnServerRestart()
    
    // Get initial session
    const getInitialSession = async () => {
      // Set a reasonable timeout
      initTimeoutId = setTimeout(() => {
        if (isMounted && !isInitialized) {
          console.warn('Session loading timeout - proceeding without auth')
          setLoading(false)
          setIsInitialized(true)
        }
      }, 5000) // Reduced to 5 seconds

      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        // Clear timeout if we get a response
        if (initTimeoutId) clearTimeout(initTimeoutId)
        
        if (!isMounted) return
        
        // If there's an auth error, just proceed without auth
        if (error) {
          console.error('Session error:', error)
          setSession(null)
          setUser(null)
          setProfile(null)
          setIsInitialized(true)
          return
        }
        
        if (session?.user) {
          console.log('🔄 Initial session found - User ID:', session.user.id)
          setSession(session)
          setUser(session.user)
          // Try to fetch profile but don't fail if it doesn't exist
          console.log('👤 About to fetch profile during initialization for user:', session.user.id)
          const userProfile = await fetchUserProfile(session.user.id)
          console.log('👤 Initial profile fetch result:', userProfile)
          setProfile(userProfile)
        } else {
          setSession(null)
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        if (initTimeoutId) clearTimeout(initTimeoutId)
        if (!isMounted) return
        
        console.error('Error getting initial session:', error)
        setSession(null)
        setUser(null)
        setProfile(null)
      } finally {
        if (isMounted) {
          setLoading(false)
          setIsInitialized(true)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id || 'no user')
        
        if (!isMounted) return
        
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('🔐 SIGNED_IN event - User ID:', session.user.id)
            setLoading(true)
            setSession(session)
            setUser(session.user)
            
            // Try to fetch profile but don't fail if it doesn't exist
            console.log('👤 About to fetch profile for user:', session.user.id)
            const userProfile = await fetchUserProfile(session.user.id)
            console.log('👤 Profile fetch result:', userProfile)
            setProfile(userProfile)
            
            // Clear timeout if this happens during initialization
            if (initTimeoutId) {
              clearTimeout(initTimeoutId)
              initTimeoutId = null
            }
            
            if (!isInitialized) {
              setIsInitialized(true)
            }
          } else if (event === 'SIGNED_OUT') {
            clearStoredAuthData()
            setSession(null)
            setUser(null)
            setProfile(null)
          } else if (event === 'TOKEN_REFRESHED' && session) {
            setSession(session)
          }
        } catch (error) {
          console.error('Auth state change error:', error)
        } finally {
          if (isMounted) {
            setLoading(false)
          }
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
      if (initTimeoutId) clearTimeout(initTimeoutId)
    }
  }, [])

  const value = {
    user,
    profile,
    session,
    loading,
    signOut,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}