import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { 
  apiSuccess, 
  apiError, 
  validateBody, 
  withRetry,
  SubscribeRequest,
  isValidSubscribeRequest,
  validators
} from '@/lib/api-helpers'

export interface Subscriber {
  id: string
  email: string
  created_at: string
  is_active: boolean
}

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateBody(
      request, 
      isValidSubscribeRequest, 
      'Invalid subscription request. Please provide a valid email address.'
    )
    
    if (!validation.success) {
      return validation.response
    }
    
    const { email }: SubscribeRequest = validation.data
    const cleanEmail = email.toLowerCase().trim()
    const supabase = await createClient()

    // Wrap database operations with retry logic
    const result = await withRetry(
      async () => {
        // Check if subscriber already exists
        const { data: existingSubscriber, error: checkError } = await supabase
          .from('subscribers')
          .select('id, email, is_active')
          .eq('email', cleanEmail)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is expected for new subscribers
          throw new Error(`Database error checking existing subscriber: ${checkError.message}`)
        }

        // If subscriber exists and is active
        if (existingSubscriber && existingSubscriber.is_active) {
          return {
            type: 'already_active',
            message: 'Email is already subscribed',
            data: existingSubscriber,
            status: 409
          }
        }

        // If subscriber exists but is inactive, reactivate them
        if (existingSubscriber && !existingSubscriber.is_active) {
          const { data: reactivatedSubscriber, error: updateError } = await supabase
            .from('subscribers')
            .update({ is_active: true })
            .eq('id', existingSubscriber.id)
            .select()
            .single()

          if (updateError) {
            throw new Error(`Database error reactivating subscriber: ${updateError.message}`)
          }

          return {
            type: 'reactivated',
            message: 'Successfully reactivated your subscription!',
            data: reactivatedSubscriber,
            status: 200
          }
        }

        // Create new subscriber
        const { data: newSubscriber, error: insertError } = await supabase
          .from('subscribers')
          .insert([
            {
              email: cleanEmail,
              is_active: true
            }
          ])
          .select()
          .single()

        if (insertError) {
          throw new Error(`Database error creating subscriber: ${insertError.message}`)
        }

        return {
          type: 'created',
          message: 'Successfully subscribed! Welcome to SpeculationAssist.',
          data: newSubscriber,
          status: 201
        }
      },
      3, // max retries
      1000, // initial delay
      'Subscribe user'
    )

    if (result.type === 'already_active') {
      return apiError(result.message, result.status, null, 'ALREADY_SUBSCRIBED')
    }

    return apiSuccess(result.data, result.message, result.status)
  } catch (error) {
    console.error('Error in POST /api/subscribe:', error)
    
    if (error instanceof Error && error.message.includes('Database error')) {
      return apiError('Failed to manage subscription in database', 500, error.message, 'DATABASE_ERROR')
    }
    
    return apiError('Failed to process subscription', 500, error instanceof Error ? error.message : error)
  }
}

// Handle unsubscribe requests
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return apiError('Email parameter is required', 400, null, 'MISSING_EMAIL')
    }

    if (!validators.isEmail(email)) {
      return apiError('Invalid email format', 400, null, 'INVALID_EMAIL')
    }

    const supabase = await createClient()
    const cleanEmail = email.toLowerCase().trim()

    // Wrap database operation with retry logic
    await withRetry(
      async () => {
        const { error } = await supabase
          .from('subscribers')
          .update({ is_active: false })
          .eq('email', cleanEmail)

        if (error) {
          throw new Error(`Database error unsubscribing: ${error.message}`)
        }
      },
      3, // max retries
      1000, // initial delay
      'Unsubscribe user'
    )

    return apiSuccess(null, 'Successfully unsubscribed')
  } catch (error) {
    console.error('Error in DELETE /api/subscribe:', error)
    
    if (error instanceof Error && error.message.includes('Database error')) {
      return apiError('Failed to unsubscribe in database', 500, error.message, 'DATABASE_ERROR')
    }
    
    return apiError('Failed to unsubscribe', 500, error instanceof Error ? error.message : error)
  }
}
