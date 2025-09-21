const serverConfig = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
}

// Only show critical errors in development
let hasLogged = false
if (!hasLogged && process.env.NODE_ENV === 'development') {
  hasLogged = true
  
  // Only show error if we truly have no environment variables
  if (!serverConfig.supabase.url || !serverConfig.supabase.anonKey) {
    const allSupabaseKeys = Object.keys(process.env).filter(key => key.includes('SUPABASE'))
    if (allSupabaseKeys.length === 0) {
      console.error('❌ Missing Supabase environment variables')
    }
  }
}

export default serverConfig
