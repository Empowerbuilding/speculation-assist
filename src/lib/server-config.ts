const serverConfig = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
}

// Only show debug info in development and only log once
let hasLogged = false
if (!hasLogged && process.env.NODE_ENV === 'development') {
  hasLogged = true
  
  const allSupabaseKeys = Object.keys(process.env).filter(key => key.includes('SUPABASE'))
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      hasNextPublicUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasNextPublicKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
      allSupabaseKeys: allSupabaseKeys
    })
  }

  // Only show error if we truly have no environment variables
  if (!serverConfig.supabase.url || !serverConfig.supabase.anonKey) {
    if (allSupabaseKeys.length === 0) {
      console.error('Missing Supabase environment variables')
      console.error('Available env vars:', allSupabaseKeys)
    } else {
      console.log('✅ Using fallback Supabase configuration')
    }
  }
}

export default serverConfig
