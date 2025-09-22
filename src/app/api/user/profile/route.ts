import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { 
  withAuth, 
  apiSuccess, 
  apiError, 
  validateBody, 
  withRetry,
  isValidProfileUpdate,
  ProfileUpdateRequest
} from '@/lib/api-helpers'
import { User } from '@supabase/supabase-js'

// GET /api/user/profile - Fetch user profile
export const GET = withAuth(async (user: User) => {
  try {
    const supabase = await createClient()
    
    // Wrap database operation with retry logic
    const profile = await withRetry(
      async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          throw new Error(`Database error: ${error.message}`)
        }

        return data
      },
      3, // max retries
      1000, // initial delay
      'Fetch user profile'
    )

    return apiSuccess(profile, 'Profile retrieved successfully')
  } catch (error) {
    console.error('Error in GET /api/user/profile:', error)
    
    // Check for specific error types
    if (error instanceof Error && error.message.includes('Database error')) {
      return apiError('Failed to fetch profile from database', 500, error.message, 'DATABASE_ERROR')
    }
    
    return apiError('Failed to fetch profile', 500, error instanceof Error ? error.message : error)
  }
})

// PUT /api/user/profile - Update user profile
export const PUT = withAuth(async (user: User, request: NextRequest) => {
  try {
    // Validate request body
    const validation = await validateBody(
      request, 
      isValidProfileUpdate, 
      'Invalid profile update data. Please check the format of your request.'
    )
    
    if (!validation.success) {
      return validation.response
    }
    
    const updates: ProfileUpdateRequest = validation.data
    const supabase = await createClient()
    
    // Wrap database operation with retry logic
    const updatedProfile = await withRetry(
      async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select()
          .single()

        if (error) {
          throw new Error(`Database error: ${error.message}`)
        }

        if (!data) {
          throw new Error('No profile found to update')
        }

        return data
      },
      3, // max retries
      1000, // initial delay
      'Update user profile'
    )

    return apiSuccess(updatedProfile, 'Profile updated successfully')
  } catch (error) {
    console.error('Error in PUT /api/user/profile:', error)
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('Database error')) {
        return apiError('Failed to update profile in database', 500, error.message, 'DATABASE_ERROR')
      }
      
      if (error.message.includes('No profile found')) {
        return apiError('Profile not found', 404, error.message, 'PROFILE_NOT_FOUND')
      }
    }
    
    return apiError('Failed to update profile', 500, error instanceof Error ? error.message : error)
  }
})