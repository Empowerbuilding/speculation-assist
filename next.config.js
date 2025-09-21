/** @type {import('next').NextConfig} */
const path = require('path')

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