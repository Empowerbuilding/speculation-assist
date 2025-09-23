'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient, clearStoredAuthData, clearStaleSessionsOnServerRestart } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

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

// Debug flag for detailed logging (only in development)
const DEBUG_AUTH = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true'

// Timeout wrapper utility to prevent hanging queries
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`TIMEOUT: ${timeoutMessage}`))
    }, timeoutMs)

    promise
      .then((result) => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  const fetchUserProfile = async (userId: string) => {
    if (DEBUG_AUTH) {
      console.log('🔍 [PROFILE_FETCH] Starting profile fetch for user ID:', userId)
      console.log('🔍 [PROFILE_FETCH] User ID type:', typeof userId)
      console.log('🔍 [PROFILE_FETCH] User ID length:', userId?.length)
      console.log('🔍 [PROFILE_FETCH] Supabase client available:', !!supabase)
    }
    
    if (!userId) {
      console.error('❌ [PROFILE_FETCH] No user ID provided')
      return null
    }

    try {
      if (DEBUG_AUTH) {
        console.log('🔍 [PROFILE_FETCH] Building Supabase query...')
        console.log('🔍 [PROFILE_FETCH] Table: user_profiles')
        console.log('🔍 [PROFILE_FETCH] Query: SELECT * WHERE id = ?', userId)
      }
      
      const query = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (DEBUG_AUTH) {
        console.log('🔍 [PROFILE_FETCH] Query built, executing with 5-second timeout...')
      }
      
      const startTime = Date.now()
      let queryResult
      
      try {
        queryResult = await withTimeout(
          query as unknown as Promise<{
            data: { 
              id: string; 
              email: string; 
              display_name?: string; 
              subscription_status?: string; 
              created_at: string;
              first_name?: string;
              last_name?: string;
              avatar_url?: string;
            } | null; 
            error: { message: string; code?: string; details?: string; hint?: string } | null; 
            status: number; 
            statusText: string 
          }>,
          5000, // 5 second timeout
          'Profile query exceeded 5 second timeout'
        )
      } catch (timeoutError) {
        const endTime = Date.now()
        const duration = endTime - startTime
        
        if (timeoutError instanceof Error && timeoutError.message.includes('TIMEOUT')) {
          console.warn('⏱️ [PROFILE_FETCH] Profile query timed out after', duration + 'ms')
          if (DEBUG_AUTH) {
            console.warn('⏱️ [PROFILE_FETCH] Timeout error:', timeoutError.message)
            console.log('⚠️ [PROFILE_FETCH] Setting profile to null due to timeout')
            console.log('⚠️ [PROFILE_FETCH] App will continue with null profile - user can retry later')
          }
          return null
        } else {
          // Re-throw non-timeout errors to be handled by the outer catch
          throw timeoutError
        }
      }
      
      const { data, error, status, statusText } = queryResult as { 
        data: { 
          id: string; 
          email: string; 
          display_name?: string; 
          subscription_status?: string; 
          created_at: string;
          first_name?: string;
          last_name?: string;
          avatar_url?: string;
        } | null; 
        error: { message: string; code?: string; details?: string; hint?: string } | null; 
        status: number; 
        statusText: string 
      }
      const endTime = Date.now()
      const duration = endTime - startTime

      if (DEBUG_AUTH) {
        console.log('📊 [PROFILE_FETCH] Raw Supabase response:')
        console.log('📊 [PROFILE_FETCH] - Data:', data)
        console.log('📊 [PROFILE_FETCH] - Error:', error)
        console.log('📊 [PROFILE_FETCH] - Status:', status)
        console.log('📊 [PROFILE_FETCH] - Status Text:', statusText)
        console.log('📊 [PROFILE_FETCH] - Query Duration:', duration + 'ms')
        console.log('📊 [PROFILE_FETCH] - Data type:', typeof data)
        console.log('📊 [PROFILE_FETCH] - Data is null:', data === null)
        console.log('📊 [PROFILE_FETCH] - Data is undefined:', data === undefined)
      }

      if (error) {
        console.error('❌ [PROFILE_FETCH] Error fetching user profile:', error.message)
        
        if (DEBUG_AUTH) {
          console.error('❌ [PROFILE_FETCH] - Error object:', error)
          console.error('❌ [PROFILE_FETCH] - Error code:', error.code)
          console.error('❌ [PROFILE_FETCH] - Error details:', error.details)
          console.error('❌ [PROFILE_FETCH] - Error hint:', error.hint)
        }
        
        // Check for specific error types
        if (error.code === 'PGRST116') {
          if (DEBUG_AUTH) {
            console.log('ℹ️ [PROFILE_FETCH] No rows returned (user profile doesn\'t exist)')
          }
        } else if (error.code === 'PGRST301') {
          console.error('❌ [PROFILE_FETCH] Multiple rows returned when single expected')
        }
        
        // Don't sign out user if profile doesn't exist - they might be new
        // Just return null and let the app handle it
        return null
      }

      if (data) {
        if (DEBUG_AUTH) {
          console.log('✅ [PROFILE_FETCH] Profile fetched successfully!')
          console.log('✅ [PROFILE_FETCH] - Profile ID:', data.id)
          console.log('✅ [PROFILE_FETCH] - Profile email:', data.email)
          console.log('✅ [PROFILE_FETCH] - Profile display_name:', data.display_name)
          console.log('✅ [PROFILE_FETCH] - Profile subscription_status:', data.subscription_status)
          console.log('✅ [PROFILE_FETCH] - Profile created_at:', data.created_at)
          console.log('✅ [PROFILE_FETCH] - Full profile data:', JSON.stringify(data, null, 2))
        }
        return data as UserProfile
      } else {
        console.warn('⚠️ [PROFILE_FETCH] No error but data is null/undefined')
        if (DEBUG_AUTH) {
          console.warn('⚠️ [PROFILE_FETCH] This might indicate an empty result set')
        }
        return null
      }
    } catch (exception) {
      console.error('💥 [PROFILE_FETCH] Exception during profile fetch:', exception instanceof Error ? exception.message : 'Unknown error')
      
      if (DEBUG_AUTH) {
        console.error('💥 [PROFILE_FETCH] - Exception object:', exception)
        console.error('💥 [PROFILE_FETCH] - Exception stack:', exception instanceof Error ? exception.stack : 'No stack trace')
        console.error('💥 [PROFILE_FETCH] - Exception name:', exception instanceof Error ? exception.name : 'Unknown')
        console.error('💥 [PROFILE_FETCH] - User ID at time of exception:', userId)
        console.error('💥 [PROFILE_FETCH] - Supabase client status:', !!supabase)
      }
      
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
    if (DEBUG_AUTH) {
      console.log('🚪 [SIGNOUT] SignOut function called')
      console.log('🚪 [SIGNOUT] Current user state:', user?.id || 'No user')
      console.log('🚪 [SIGNOUT] Current session state:', session?.access_token ? 'Session exists' : 'No session')
      console.log('🚪 [SIGNOUT] Current profile state:', profile?.id || 'No profile')
      console.log('🚪 [SIGNOUT] Current loading state:', loading)
      console.log('🚪 [SIGNOUT] Supabase client available:', !!supabase)
    }
    
    const signOutStartTime = Date.now()
    if (DEBUG_AUTH) {
      console.log('🚪 [SIGNOUT] Starting signOut process at:', new Date().toISOString())
    }
    
    try {
      if (DEBUG_AUTH) {
        console.log('🔄 [SIGNOUT] Step 1: Setting loading state to true')
      }
      setLoading(true)
      if (DEBUG_AUTH) {
        console.log('✅ [SIGNOUT] Loading state set successfully')
      }

      if (DEBUG_AUTH) {
        console.log('🧹 [SIGNOUT] Step 2: Clearing stored auth data from localStorage/sessionStorage')
      }
      try {
        clearStoredAuthData()
        if (DEBUG_AUTH) {
          console.log('✅ [SIGNOUT] Stored auth data cleared successfully')
        }
      } catch (clearDataError) {
        console.error('❌ [SIGNOUT] Error clearing stored auth data:', clearDataError instanceof Error ? clearDataError.message : 'Unknown error')
        if (DEBUG_AUTH) {
          console.error('❌ [SIGNOUT] - Clear data error type:', typeof clearDataError)
        }
      }
      
      if (DEBUG_AUTH) {
        console.log('📤 [SIGNOUT] Step 3: Calling supabase.auth.signOut()')
        console.log('📤 [SIGNOUT] - Supabase client type:', typeof supabase)
        console.log('📤 [SIGNOUT] - Supabase auth available:', !!supabase?.auth)
        console.log('📤 [SIGNOUT] - SignOut method available:', typeof supabase?.auth?.signOut)
      }
      
      let supabaseSignOutResult
      const supabaseStartTime = Date.now()
      
      try {
        if (DEBUG_AUTH) {
          console.log('📤 [SIGNOUT] - Executing Supabase signOut with 5-second timeout...')
        }
        supabaseSignOutResult = await withTimeout(
          supabase.auth.signOut(),
          5000, // 5 second timeout
          'Supabase signOut exceeded 5 second timeout'
        )
        const supabaseEndTime = Date.now()
        const supabaseDuration = supabaseEndTime - supabaseStartTime
        
        if (DEBUG_AUTH) {
          console.log('📊 [SIGNOUT] Supabase signOut completed in:', supabaseDuration + 'ms')
          console.log('📊 [SIGNOUT] Supabase signOut result:', supabaseSignOutResult)
          console.log('📊 [SIGNOUT] - Result type:', typeof supabaseSignOutResult)
          console.log('📊 [SIGNOUT] - Has error:', !!supabaseSignOutResult?.error)
        }
        
        if (supabaseSignOutResult?.error) {
          console.error('❌ [SIGNOUT] Supabase signOut returned error:', supabaseSignOutResult.error.message)
          if (DEBUG_AUTH) {
            console.error('❌ [SIGNOUT] - Error object:', supabaseSignOutResult.error)
            console.error('❌ [SIGNOUT] - Error status:', supabaseSignOutResult.error.status)
            console.error('❌ [SIGNOUT] - Error code:', supabaseSignOutResult.error.code)
            console.error('❌ [SIGNOUT] - Error details:', (supabaseSignOutResult.error as { details?: unknown }).details)
          }
        } else if (DEBUG_AUTH) {
          console.log('✅ [SIGNOUT] Supabase signOut completed successfully')
          console.log('✅ [SIGNOUT] - No errors returned from Supabase')
        }
      } catch (supabaseError) {
        const supabaseEndTime = Date.now()
        const supabaseDuration = supabaseEndTime - supabaseStartTime
        
        if (supabaseError instanceof Error && supabaseError.message.includes('TIMEOUT')) {
          console.warn('⏱️ [SIGNOUT] Supabase signOut timed out after', supabaseDuration + 'ms - forcing local cleanup')
          if (DEBUG_AUTH) {
            console.warn('⏱️ [SIGNOUT] Timeout error:', supabaseError.message)
            console.log('⚠️ [SIGNOUT] Will continue with local state clearing and redirect')
            console.log('⚠️ [SIGNOUT] User session will be cleared locally even without server confirmation')
          }
        } else {
          console.error('💥 [SIGNOUT] Exception during supabase.auth.signOut():', supabaseError instanceof Error ? supabaseError.message : 'Unknown error')
          if (DEBUG_AUTH) {
            console.error('💥 [SIGNOUT] - Exception object:', supabaseError)
            console.error('💥 [SIGNOUT] - Exception type:', typeof supabaseError)
            console.error('💥 [SIGNOUT] - Exception stack:', supabaseError instanceof Error ? supabaseError.stack : 'No stack trace')
            console.error('💥 [SIGNOUT] - Exception name:', supabaseError instanceof Error ? supabaseError.name : 'Unknown')
          }
        }
        
        // Continue with cleanup even if Supabase signOut fails or times out
        if (DEBUG_AUTH) {
          console.log('⚠️ [SIGNOUT] Continuing with local cleanup despite Supabase error/timeout')
        }
      }
      
      if (DEBUG_AUTH) {
        console.log('🔄 [SIGNOUT] Step 4: Clearing React state variables')
      }
      try {
        if (DEBUG_AUTH) {
          console.log('🔄 [SIGNOUT] - Setting user to null (was:', user?.id || 'null', ')')
        }
        setUser(null)
        if (DEBUG_AUTH) {
          console.log('✅ [SIGNOUT] - User state cleared')
        }
        
        if (DEBUG_AUTH) {
          console.log('🔄 [SIGNOUT] - Setting profile to null (was:', profile?.id || 'null', ')')
        }
        setProfile(null)
        if (DEBUG_AUTH) {
          console.log('✅ [SIGNOUT] - Profile state cleared')
        }
        
        if (DEBUG_AUTH) {
          console.log('🔄 [SIGNOUT] - Setting session to null (was:', session?.access_token ? 'exists' : 'null', ')')
        }
        setSession(null)
        if (DEBUG_AUTH) {
          console.log('✅ [SIGNOUT] - Session state cleared')
        }
      } catch (stateError) {
        console.error('❌ [SIGNOUT] Error clearing React state:', stateError instanceof Error ? stateError.message : 'Unknown error')
        if (DEBUG_AUTH) {
          console.error('❌ [SIGNOUT] - State error type:', typeof stateError)
        }
      }
      
      if (DEBUG_AUTH) {
        console.log('🏠 [SIGNOUT] Step 5: Redirecting to landing page')
        console.log('🏠 [SIGNOUT] - Router available:', !!router)
        console.log('🏠 [SIGNOUT] - Router push method available:', typeof router?.push)
        console.log('🏠 [SIGNOUT] - Target route: "/"')
      }
      
      try {
        const routerStartTime = Date.now()
        await router.push('/')
        const routerEndTime = Date.now()
        const routerDuration = routerEndTime - routerStartTime
        
        if (DEBUG_AUTH) {
          console.log('✅ [SIGNOUT] Router navigation completed successfully')
          console.log('✅ [SIGNOUT] - Navigation duration:', routerDuration + 'ms')
          console.log('✅ [SIGNOUT] - Successfully redirected to landing page')
        }
      } catch (routerError) {
        console.error('❌ [SIGNOUT] Error during router navigation:', routerError instanceof Error ? routerError.message : 'Unknown error')
        
        if (DEBUG_AUTH) {
          console.error('❌ [SIGNOUT] - Router error object:', routerError)
          console.error('❌ [SIGNOUT] - Router error type:', typeof routerError)
          console.error('❌ [SIGNOUT] - Router error stack:', routerError instanceof Error ? routerError.stack : 'No stack trace')
        }
        
        // Try alternative navigation method
        if (DEBUG_AUTH) {
          console.log('⚠️ [SIGNOUT] Attempting alternative navigation using window.location')
        }
        try {
          if (typeof window !== 'undefined') {
            window.location.href = '/'
            if (DEBUG_AUTH) {
              console.log('✅ [SIGNOUT] Alternative navigation completed')
            }
          } else {
            console.error('❌ [SIGNOUT] Window object not available for alternative navigation')
          }
        } catch (windowError) {
          console.error('💥 [SIGNOUT] Alternative navigation also failed:', windowError instanceof Error ? windowError.message : 'Unknown error')
        }
      }
      
      const signOutEndTime = Date.now()
      const totalDuration = signOutEndTime - signOutStartTime
      if (DEBUG_AUTH) {
        console.log('✅ [SIGNOUT] SignOut process completed successfully!')
        console.log('✅ [SIGNOUT] - Total duration:', totalDuration + 'ms')
        console.log('✅ [SIGNOUT] - Completed at:', new Date().toISOString())
      }
      
    } catch (generalError) {
      console.error('💥 [SIGNOUT] General exception during signOut process:', generalError instanceof Error ? generalError.message : 'Unknown error')
      
      if (DEBUG_AUTH) {
        console.error('💥 [SIGNOUT] - General error object:', generalError)
        console.error('💥 [SIGNOUT] - General error type:', typeof generalError)
        console.error('💥 [SIGNOUT] - General error stack:', generalError instanceof Error ? generalError.stack : 'No stack trace')
        console.error('💥 [SIGNOUT] - General error name:', generalError instanceof Error ? generalError.name : 'Unknown')
        console.log('🧹 [SIGNOUT] Performing emergency cleanup due to exception')
      }
      
      // Emergency cleanup - Clear stored data even if signOut fails
      try {
        if (DEBUG_AUTH) {
          console.log('🧹 [SIGNOUT] - Emergency: Clearing stored auth data')
        }
        clearStoredAuthData()
        if (DEBUG_AUTH) {
          console.log('✅ [SIGNOUT] - Emergency: Stored data cleared')
        }
      } catch (emergencyClearError) {
        console.error('💥 [SIGNOUT] - Emergency: Failed to clear stored data:', emergencyClearError instanceof Error ? emergencyClearError.message : 'Unknown error')
      }
      
      try {
        if (DEBUG_AUTH) {
          console.log('🧹 [SIGNOUT] - Emergency: Clearing React state')
        }
        setUser(null)
        setProfile(null)
        setSession(null)
        if (DEBUG_AUTH) {
          console.log('✅ [SIGNOUT] - Emergency: React state cleared')
        }
      } catch (emergencyStateError) {
        console.error('💥 [SIGNOUT] - Emergency: Failed to clear React state:', emergencyStateError instanceof Error ? emergencyStateError.message : 'Unknown error')
      }
      
      // Emergency navigation - Still redirect to landing page even if there was an error
      try {
        if (DEBUG_AUTH) {
          console.log('🏠 [SIGNOUT] - Emergency: Attempting navigation to landing page')
        }
        await router.push('/')
        if (DEBUG_AUTH) {
          console.log('✅ [SIGNOUT] - Emergency: Navigation successful')
        }
      } catch (emergencyRouterError) {
        console.error('❌ [SIGNOUT] - Emergency: Router navigation failed:', emergencyRouterError instanceof Error ? emergencyRouterError.message : 'Unknown error')
        
        // Last resort navigation
        try {
          if (typeof window !== 'undefined') {
            if (DEBUG_AUTH) {
              console.log('🏠 [SIGNOUT] - Emergency: Using window.location as last resort')
            }
            window.location.href = '/'
            if (DEBUG_AUTH) {
              console.log('✅ [SIGNOUT] - Emergency: Window navigation completed')
            }
          }
        } catch (emergencyWindowError) {
          console.error('💥 [SIGNOUT] - Emergency: All navigation methods failed:', emergencyWindowError instanceof Error ? emergencyWindowError.message : 'Unknown error')
        }
      }
    } finally {
      if (DEBUG_AUTH) {
        console.log('🏁 [SIGNOUT] Finally block executing')
        console.log('🏁 [SIGNOUT] - Setting loading state to false')
      }
      
      try {
        setLoading(false)
        if (DEBUG_AUTH) {
          console.log('✅ [SIGNOUT] - Loading state cleared successfully')
        }
      } catch (finallyError) {
        console.error('❌ [SIGNOUT] - Error in finally block:', finallyError instanceof Error ? finallyError.message : 'Unknown error')
      }
      
      const finalEndTime = Date.now()
      const finalTotalDuration = finalEndTime - signOutStartTime
      if (DEBUG_AUTH) {
        console.log('🏁 [SIGNOUT] SignOut process fully completed')
        console.log('🏁 [SIGNOUT] - Final total duration:', finalTotalDuration + 'ms')
        console.log('🏁 [SIGNOUT] - Process ended at:', new Date().toISOString())
      }
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
          if (DEBUG_AUTH) {
            console.log('🔄 Initial session found - User ID:', session.user.id)
          }
          setSession(session)
          setUser(session.user)
          // Try to fetch profile but don't fail if it doesn't exist
          if (DEBUG_AUTH) {
            console.log('👤 About to fetch profile during initialization for user:', session.user.id)
          }
          const userProfile = await fetchUserProfile(session.user.id)
          if (DEBUG_AUTH) {
            console.log('👤 Initial profile fetch result:', userProfile)
          }
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
        if (DEBUG_AUTH) {
          console.log('Auth state change:', event, session?.user?.id || 'no user')
        }
        
        if (!isMounted) return
        
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            if (DEBUG_AUTH) {
              console.log('🔐 SIGNED_IN event - User ID:', session.user.id)
            }
            setLoading(true)
            setSession(session)
            setUser(session.user)
            
            // Try to fetch profile but don't fail if it doesn't exist
            if (DEBUG_AUTH) {
              console.log('👤 About to fetch profile for user:', session.user.id)
            }
            const userProfile = await fetchUserProfile(session.user.id)
            if (DEBUG_AUTH) {
              console.log('👤 Profile fetch result:', userProfile)
            }
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
            // Redirect to landing page on sign out
            router.push('/')
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