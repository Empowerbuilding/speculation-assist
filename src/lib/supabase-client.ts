import { createBrowserClient } from '@supabase/ssr'
import serverConfig from './server-config'

export function createClient() {
  // Use config with fallback to hardcoded values if env vars fail
  const supabaseUrl = serverConfig.supabase.url || 'https://ovwmwqiklprhdwuiypax.supabase.co'
  const supabaseKey = serverConfig.supabase.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92d213cWlrbHByaGR3dWl5cGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MDUwNjcsImV4cCI6MjA3Mzk4MTA2N30.kjnc5Nv5V3CcjmcEW5uEhIAUW_emNzVQa1RAfDFEM2g'

  return createBrowserClient(supabaseUrl, supabaseKey)
}