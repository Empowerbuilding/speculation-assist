import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import serverConfig from './server-config'

export async function createClient() {
  const cookieStore = await cookies()

  // Use config with fallback to hardcoded values if env vars fail
  const supabaseUrl = serverConfig.supabase.url || 'https://ovwmwqiklprhdwuiypax.supabase.co'
  const supabaseKey = serverConfig.supabase.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92d213cWlrbHByaGR3dWl5cGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MDUwNjcsImV4cCI6MjA3Mzk4MTA2N30.kjnc5Nv5V3CcjmcEW5uEhIAUW_emNzVQa1RAfDFEM2g'

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}