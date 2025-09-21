import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface SaveIdeaRequest {
  idea_id: number
  notes?: string
}

interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export async function GET(): Promise<NextResponse<ApiResponse<any[]>>> {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's saved ideas with idea details
    const { data: savedIdeas, error } = await supabase
      .from('user_idea_interactions')
      .select(`
        id,
        idea_id,
        notes,
        created_at,
        generated_ideas (
          id,
          theme,
          analysis,
          tickers,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .eq('interaction_type', 'saved')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved ideas:', error)
      return NextResponse.json(
        { error: 'Failed to fetch saved ideas' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: savedIdeas || [] })
  } catch (error) {
    console.error('Error in saved ideas GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const body: SaveIdeaRequest = await request.json()
    
    if (!body.idea_id) {
      return NextResponse.json(
        { error: 'Idea ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if idea is already saved
    const { data: existingInteraction, error: checkError } = await supabase
      .from('user_idea_interactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('idea_id', body.idea_id)
      .eq('interaction_type', 'saved')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing interaction:', checkError)
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      )
    }

    if (existingInteraction) {
      return NextResponse.json(
        { message: 'Idea is already saved' },
        { status: 200 }
      )
    }

    // Save the idea
    const { data: savedInteraction, error: saveError } = await supabase
      .from('user_idea_interactions')
      .insert([
        {
          user_id: user.id,
          idea_id: body.idea_id,
          interaction_type: 'saved',
          notes: body.notes || null
        }
      ])
      .select()
      .single()

    if (saveError) {
      console.error('Error saving idea:', saveError)
      return NextResponse.json(
        { error: 'Failed to save idea' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: savedInteraction,
      message: 'Idea saved successfully!'
    }, { status: 201 })
  } catch (error) {
    console.error('Error in saved ideas POST:', error)
    
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

export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const { searchParams } = new URL(request.url)
    const ideaId = searchParams.get('idea_id')

    if (!ideaId) {
      return NextResponse.json(
        { error: 'Idea ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Remove the saved interaction
    const { error: deleteError } = await supabase
      .from('user_idea_interactions')
      .delete()
      .eq('user_id', user.id)
      .eq('idea_id', parseInt(ideaId))
      .eq('interaction_type', 'saved')

    if (deleteError) {
      console.error('Error removing saved idea:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove saved idea' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Idea removed from saved list!'
    })
  } catch (error) {
    console.error('Error in saved ideas DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
