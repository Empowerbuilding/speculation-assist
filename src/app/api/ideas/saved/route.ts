import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { 
  withAuth, 
  apiSuccess, 
  apiError, 
  validateBody, 
  withRetry,
  SaveIdeaRequest,
  isValidSaveIdeaRequest
} from '@/lib/api-helpers'
import { User } from '@supabase/supabase-js'

export const GET = withAuth(async (user: User) => {
  try {
    const supabase = await createClient()
    
    // Wrap database operation with retry logic
    const savedIdeas = await withRetry(
      async () => {
        const { data, error } = await supabase
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
          throw new Error(`Database error: ${error.message}`)
        }

        return data || []
      },
      3, // max retries
      1000, // initial delay
      'Fetch saved ideas'
    )

    return apiSuccess(savedIdeas, `Retrieved ${savedIdeas.length} saved ideas`)
  } catch (error) {
    console.error('Error in GET /api/ideas/saved:', error)
    
    if (error instanceof Error && error.message.includes('Database error')) {
      return apiError('Failed to fetch saved ideas from database', 500, error.message, 'DATABASE_ERROR')
    }
    
    return apiError('Failed to fetch saved ideas', 500, error instanceof Error ? error.message : error)
  }
})

export const POST = withAuth(async (user: User, request: NextRequest) => {
  try {
    // Validate request body
    const validation = await validateBody(
      request, 
      isValidSaveIdeaRequest, 
      'Invalid save idea request. Please provide a valid idea_id.'
    )
    
    if (!validation.success) {
      return validation.response
    }
    
    const { idea_id, notes }: SaveIdeaRequest = validation.data
    const supabase = await createClient()
    
    // Wrap database operations with retry logic
    const result = await withRetry(
      async () => {
        // Check if idea is already saved
        const { data: existingInteraction, error: checkError } = await supabase
          .from('user_idea_interactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('idea_id', idea_id)
          .eq('interaction_type', 'saved')
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          throw new Error(`Database error checking existing interaction: ${checkError.message}`)
        }

        if (existingInteraction) {
          return { alreadyExists: true, data: null }
        }

        // Save the idea
        const { data: savedInteraction, error: saveError } = await supabase
          .from('user_idea_interactions')
          .insert([
            {
              user_id: user.id,
              idea_id,
              interaction_type: 'saved',
              notes: notes || null
            }
          ])
          .select()
          .single()

        if (saveError) {
          throw new Error(`Database error saving idea: ${saveError.message}`)
        }

        return { alreadyExists: false, data: savedInteraction }
      },
      3, // max retries
      1000, // initial delay
      'Save idea interaction'
    )

    if (result.alreadyExists) {
      return apiSuccess(null, 'Idea is already saved')
    }

    return apiSuccess(result.data, 'Idea saved successfully!', 201)
  } catch (error) {
    console.error('Error in POST /api/ideas/saved:', error)
    
    if (error instanceof Error && error.message.includes('Database error')) {
      return apiError('Failed to save idea to database', 500, error.message, 'DATABASE_ERROR')
    }
    
    return apiError('Failed to save idea', 500, error instanceof Error ? error.message : error)
  }
})

export const DELETE = withAuth(async (user: User, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const ideaId = searchParams.get('idea_id')

    if (!ideaId) {
      return apiError('Idea ID is required in query parameters', 400, null, 'MISSING_IDEA_ID')
    }

    const parsedIdeaId = parseInt(ideaId)
    if (isNaN(parsedIdeaId) || parsedIdeaId <= 0) {
      return apiError('Invalid idea ID format', 400, null, 'INVALID_IDEA_ID')
    }

    const supabase = await createClient()

    // Wrap database operation with retry logic
    await withRetry(
      async () => {
        const { error: deleteError } = await supabase
          .from('user_idea_interactions')
          .delete()
          .eq('user_id', user.id)
          .eq('idea_id', parsedIdeaId)
          .eq('interaction_type', 'saved')

        if (deleteError) {
          throw new Error(`Database error removing saved idea: ${deleteError.message}`)
        }
      },
      3, // max retries
      1000, // initial delay
      'Remove saved idea'
    )

    return apiSuccess(null, 'Idea removed from saved list!')
  } catch (error) {
    console.error('Error in DELETE /api/ideas/saved:', error)
    
    if (error instanceof Error && error.message.includes('Database error')) {
      return apiError('Failed to remove saved idea from database', 500, error.message, 'DATABASE_ERROR')
    }
    
    return apiError('Failed to remove saved idea', 500, error instanceof Error ? error.message : error)
  }
})
