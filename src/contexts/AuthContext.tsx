'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
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
  const hasProcessedAuthRef = useRef(false)
  const lastProcessedSessionRef = useRef<string | null>(null)
  
  const supabase = createClient()

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        // If user profile doesn't exist, sign out the user
        if (error.code === 'PGRST116') { // No rows returned
          console.log('User profile not found, signing out...')
          await supabase.auth.signOut()
        }
        return null
      }

      return data as UserProfile
    } catch (error) {
      console.error('Error fetching user profile:', error)
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
      lastProcessedSessionRef.current = null
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setSession(null)
    } catch (error) {
      console.error('Error signing out:', error)
      // Clear stored data even if signOut fails
      clearStoredAuthData()
      lastProcessedSessionRef.current = null
      setUser(null)
      setProfile(null)
      setSession(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Clear stale sessions on potential server restart
    clearStaleSessionsOnServerRestart()
    
    // Get initial session with timeout to prevent hanging
    const getInitialSession = async () => {
      let timeoutId: NodeJS.Timeout | null = null
      
      // Only set timeout if not already initialized (prevents timeout during auth state changes)
      if (!isInitialized) {
        timeoutId = setTimeout(() => {
          // Only clear auth state if we haven't processed any authentication yet
          if (!hasProcessedAuthRef.current) {
            console.warn('Session loading timeout - clearing auth state')
            clearStoredAuthData()
            setSession(null)
            setUser(null)
            setProfile(null)
            setLoading(false)
            setIsInitialized(true)
          }
        }, 10000) // 10 second timeout
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        // Clear timeout if we get a response
        if (timeoutId) clearTimeout(timeoutId)
        
        // If there's an auth error, clear everything and continue
        if (error) {
          console.error('Session error:', error)
          // Clear any invalid session data from storage
          clearStoredAuthData()
          await supabase.auth.signOut()
          setSession(null)
          setUser(null)
          setProfile(null)
          setIsInitialized(true)
          return
        }
        
        if (session?.user) {
          hasProcessedAuthRef.current = true
          // Track this session to prevent duplicate processing
          if (session.access_token) {
            lastProcessedSessionRef.current = session.access_token
          }
          const userProfile = await fetchUserProfile(session.user.id)
          // Only set session/user if profile exists
          if (userProfile) {
            setSession(session)
            setUser(session.user)
            setProfile(userProfile)
          } else {
            // Profile doesn't exist, clear everything
            setSession(null)
            setUser(null)
            setProfile(null)
          }
        } else {
          hasProcessedAuthRef.current = true
          setSession(null)
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId)
        console.error('Error getting initial session:', error)
        // Clear everything on error including stored data
        clearStoredAuthData()
        try {
          await supabase.auth.signOut()
        } catch (signOutError) {
          console.error('Error during signOut:', signOutError)
        }
        setSession(null)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
        setIsInitialized(true)
      }
    }

    getInitialSession()

    // Listen for auth changes with improved error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id || 'no user', 'initialized:', isInitialized)
        
        // Don't process auth state changes until initial session is loaded, 
        // EXCEPT for SIGNED_IN events which should always be processed immediately
        if (!isInitialized && event !== 'SIGNED_IN') {
          console.log('Ignoring auth state change - not initialized yet')
          return
        }
        
        // Prevent duplicate processing of the same session
        if (event === 'SIGNED_IN' && session?.access_token) {
          if (lastProcessedSessionRef.current === session.access_token) {
            console.log('Ignoring duplicate SIGNED_IN event for same session token')
            return
          }
          lastProcessedSessionRef.current = session.access_token
        }
        
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            setLoading(true)
            hasProcessedAuthRef.current = true
            const userProfile = await fetchUserProfile(session.user.id)
            // Only set session/user if profile exists
            if (userProfile) {
              setSession(session)
              setUser(session.user)
              setProfile(userProfile)
            } else {
              // Profile doesn't exist, clear everything
              console.warn('User profile not found for authenticated user')
              setSession(null)
              setUser(null)
              setProfile(null)
            }
            // Mark as initialized if this was processed during initialization
            if (!isInitialized) {
              setIsInitialized(true)
            }
          } else if (event === 'SIGNED_OUT') {
            // Clear state on sign out
            clearStoredAuthData()
            lastProcessedSessionRef.current = null
            setSession(null)
            setUser(null)
            setProfile(null)
          } else if (event === 'TOKEN_REFRESHED') {
            // Keep existing state on token refresh, just update session
            if (session) {
              setSession(session)
            }
          }
        } catch (error) {
          console.error('Auth state change error:', error)
          // On any error, clear the state and stored data
          clearStoredAuthData()
          setSession(null)
          setUser(null)
          setProfile(null)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
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