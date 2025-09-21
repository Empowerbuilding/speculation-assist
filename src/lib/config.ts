// Configuration file to handle environment variables properly
export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  logo: {
    url: process.env.NEXT_PUBLIC_LOGO_URL || '',
  },
} as const

// Export individual values for easier access
export const LOGO_URL = config.logo.url
export const SUPABASE_URL = config.supabase.url
export const SUPABASE_ANON_KEY = config.supabase.anonKey
