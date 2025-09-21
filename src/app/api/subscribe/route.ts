import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export interface Subscriber {
  id: string
  email: string
  created_at: string
  is_active: boolean
}

interface SubscribeRequest {
  email: string
}

interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(email: string): boolean {
  return emailRegex.test(email.toLowerCase())
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Subscriber>>> {
  try {
    const body: SubscribeRequest = await request.json()
    
    // Validate request body
    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!validateEmail(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const email = body.email.toLowerCase().trim()
    const supabase = await createClient()

    // Check if subscriber already exists
    const { data: existingSubscriber, error: checkError } = await supabase
      .from('subscribers')
      .select('id, email, is_active')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new subscribers
      console.error('Error checking existing subscriber:', checkError)
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      )
    }

    // If subscriber exists and is active
    if (existingSubscriber && existingSubscriber.is_active) {
      return NextResponse.json(
        { error: 'Email is already subscribed' },
        { status: 409 }
      )
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
        console.error('Error reactivating subscriber:', updateError)
        return NextResponse.json(
          { error: 'Failed to reactivate subscription' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: reactivatedSubscriber,
        message: 'Successfully reactivated your subscription!'
      })
    }

    // Create new subscriber
    const { data: newSubscriber, error: insertError } = await supabase
      .from('subscribers')
      .insert([
        {
          email,
          is_active: true
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating subscriber:', insertError)
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: newSubscriber,
      message: 'Successfully subscribed! Welcome to SpeculationAssist.'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in subscribe endpoint:', error)
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Optional: Handle unsubscribe requests
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('subscribers')
      .update({ is_active: false })
      .eq('email', email.toLowerCase().trim())

    if (error) {
      console.error('Error unsubscribing:', error)
      return NextResponse.json(
        { error: 'Failed to unsubscribe' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Successfully unsubscribed'
    })

  } catch (error) {
    console.error('Error in unsubscribe endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
