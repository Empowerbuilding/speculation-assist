/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname
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