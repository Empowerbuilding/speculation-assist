import { createBrowserClient } from '@supabase/ssr'
import serverConfig from './server-config'

export function createClient() {
  // Use config with fallback to hardcoded values if env vars fail
  const supabaseUrl = serverConfig.supabase.url || 'https://ovwmwqiklprhdwuiypax.supabase.co'
  const supabaseKey = serverConfig.supabase.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92d213cWlrbHByaGR3dWl5cGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MDUwNjcsImV4cCI6MjA3Mzk4MTA2N30.kjnc5Nv5V3CcjmcEW5uEhIAUW_emNzVQa1RAfDFEM2g'

  return createBrowserClient(supabaseUrl, supabaseKey)
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