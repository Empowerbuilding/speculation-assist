/** @type {import('next').NextConfig} */
const path = require('path')

// Force environment variables as workaround
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ovwmwqiklprhdwuiypax.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92d213cWlrbHByaGR3dWl5cGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MDUwNjcsImV4cCI6MjA3Mzk4MTA2N30.kjnc5Nv5V3CcjmcEW5uEhIAUW_emNzVQa1RAfDFEM2g'
process.env.SUPABASE_URL = 'https://ovwmwqiklprhdwuiypax.supabase.co'
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92d213cWlrbHByaGR3dWl5cGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MDUwNjcsImV4cCI6MjA3Mzk4MTA2N30.kjnc5Nv5V3CcjmcEW5uEhIAUW_emNzVQa1RAfDFEM2g'

const nextConfig = {
  // Fix the workspace root detection issue
  outputFileTracingRoot: path.resolve('.'),
  
  // Explicitly define environment variables for middleware
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ovwmwqiklprhdwuiypax.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig