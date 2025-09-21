const serverConfig = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
}

// Validate that we have the required environment variables
if (!serverConfig.supabase.url || !serverConfig.supabase.anonKey) {
  console.error('Missing Supabase environment variables')
  console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('SUPABASE')))
}

export default serverConfig
