import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Hardcoded values as fallback for Turbopack environment variable issue
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ovwmwqiklprhdwuiypax.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92d213cWlrbHByaGR3dWl5cGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MDUwNjcsImV4cCI6MjA3Mzk4MTA2N30.kjnc5Nv5V3CcjmcEW5uEhIAUW_emNzVQa1RAfDFEM2g'

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in middleware')
    return response
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    // This will refresh session if expired - required for Server Components
    await supabase.auth.getUser()
  } catch (error) {
    console.error('Middleware Supabase error:', error)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}