import { createBrowserClient } from '@supabase/ssr'
import { config } from './config'

export function createClient() {
  // Validate that required environment variables are present
  if (!config.supabase.url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please add it to your .env.local file or environment configuration.'
    )
  }

  if (!config.supabase.anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
      'Please add it to your .env.local file or environment configuration.'
    )
  }

  return createBrowserClient(config.supabase.url, config.supabase.anonKey)
}

// Helper function to clear all stored auth data
export function clearStoredAuthData() {
  if (typeof window !== 'undefined') {
    // Clear localStorage
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    // Clear sessionStorage
    const sessionKeysToRemove = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith('sb-')) {
        sessionKeysToRemove.push(key)
      }
    }
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key))
  }
}

// Check for stale sessions and clear them if server was restarted
export function clearStaleSessionsOnServerRestart() {
  if (typeof window !== 'undefined') {
    const serverStartTime = 'server_start_time'
    const lastKnownStartTime = localStorage.getItem(serverStartTime)
    const currentTime = Date.now().toString()
    
    // If no previous start time or it's been more than 5 minutes, assume server restart
    if (!lastKnownStartTime || (Date.now() - parseInt(lastKnownStartTime)) > 5 * 60 * 1000) {
      console.log('Potential server restart detected, clearing stale auth data')
      clearStoredAuthData()
      localStorage.setItem(serverStartTime, currentTime)
    }
  }
}