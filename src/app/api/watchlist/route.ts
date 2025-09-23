import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { 
  withAuth, 
  apiSuccess, 
  apiError, 
  validateBody, 
  withRetry,
  AddToWatchlistRequest,
  isValidWatchlistRequest
} from '@/lib/api-helpers'
import { User } from '@supabase/supabase-js'

export const GET = withAuth(async (user: User) => {
  try {
    const supabase = await createClient()
    
    // Wrap database operation with retry logic
    const watchlists = await withRetry(
      async () => {
        const { data, error } = await supabase
          .from('user_watchlists')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          throw new Error(`Database error: ${error.message}`)
        }

        return data || []
      },
      3, // max retries
      1000, // initial delay
      'Fetch user watchlists'
    )

    return apiSuccess(watchlists, `Retrieved ${watchlists.length} watchlists`)
  } catch (error) {
    console.error('Error in GET /api/watchlist:', error)
    
    if (error instanceof Error && error.message.includes('Database error')) {
      return apiError('Failed to fetch watchlists from database', 500, error.message, 'DATABASE_ERROR')
    }
    
    return apiError('Failed to fetch watchlists', 500, error instanceof Error ? error.message : error)
  }
})

export const POST = withAuth(async (user: User, request: NextRequest) => {
  try {
    // Validate request body
    const validation = await validateBody(
      request, 
      isValidWatchlistRequest, 
      'Invalid watchlist request. Please provide a valid ticker symbol.'
    )
    
    if (!validation.success) {
      return validation.response
    }
    
    const { ticker, watchlist_name }: AddToWatchlistRequest = validation.data
    const supabase = await createClient()
    
    const cleanTicker = ticker.toUpperCase().trim()
    const watchlistName = watchlist_name || 'Default Watchlist'

    // Wrap database operations with retry logic
    const result = await withRetry(
      async () => {
        // Check if user has a default watchlist or the specified watchlist
        const { data: existingWatchlist, error: fetchError } = await supabase
          .from('user_watchlists')
          .select('*')
          .eq('user_id', user.id)
          .eq('name', watchlistName)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw new Error(`Database error checking existing watchlist: ${fetchError.message}`)
        }

        if (existingWatchlist) {
          // Check if ticker already exists in watchlist
          if (existingWatchlist.tickers.includes(cleanTicker)) {
            return { 
              type: 'already_exists', 
              message: `${cleanTicker} is already in your ${watchlistName}`,
              data: existingWatchlist
            }
          }

          // Add ticker to existing watchlist
          const updatedTickers = [...existingWatchlist.tickers, cleanTicker]
          
          const { data: updatedWatchlist, error: updateError } = await supabase
            .from('user_watchlists')
            .update({ 
              tickers: updatedTickers,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingWatchlist.id)
            .select()
            .single()

          if (updateError) {
            throw new Error(`Database error updating watchlist: ${updateError.message}`)
          }

          return {
            type: 'updated',
            message: `${cleanTicker} added to ${watchlistName}!`,
            data: updatedWatchlist
          }
        } else {
          // Create new watchlist with the ticker
          const { data: newWatchlist, error: createError } = await supabase
            .from('user_watchlists')
            .insert([
              {
                user_id: user.id,
                name: watchlistName,
                description: watchlistName === 'Default Watchlist' ? 'My default watchlist' : undefined,
                tickers: [cleanTicker],
                is_default: watchlistName === 'Default Watchlist'
              }
            ])
            .select()
            .single()

          if (createError) {
            throw new Error(`Database error creating watchlist: ${createError.message}`)
          }

          return {
            type: 'created',
            message: `Created ${watchlistName} and added ${cleanTicker}!`,
            data: newWatchlist
          }
        }
      },
      3, // max retries
      1000, // initial delay
      'Add ticker to watchlist'
    )

    const status = result.type === 'created' ? 201 : 200
    return apiSuccess(result.data, result.message, status)
  } catch (error) {
    console.error('Error in POST /api/watchlist:', error)
    
    if (error instanceof Error && error.message.includes('Database error')) {
      return apiError('Failed to manage watchlist in database', 500, error.message, 'DATABASE_ERROR')
    }
    
    return apiError('Failed to add ticker to watchlist', 500, error instanceof Error ? error.message : error)
  }
})

export const DELETE = withAuth(async (user: User, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get('ticker')
    const watchlistName = searchParams.get('watchlist_name') || 'Default Watchlist'

    if (!ticker) {
      return apiError('Ticker is required in query parameters', 400, null, 'MISSING_TICKER')
    }

    const supabase = await createClient()
    const tickerUpper = ticker.toUpperCase().trim()

    // Wrap database operations with retry logic
    const result = await withRetry(
      async () => {
        // Find the watchlist
        const { data: watchlist, error: fetchError } = await supabase
          .from('user_watchlists')
          .select('*')
          .eq('user_id', user.id)
          .eq('name', watchlistName)
          .single()

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            throw new Error('WATCHLIST_NOT_FOUND')
          }
          throw new Error(`Database error fetching watchlist: ${fetchError.message}`)
        }

        // Check if ticker exists in watchlist
        if (!watchlist.tickers.includes(tickerUpper)) {
          return {
            type: 'not_found',
            message: `${tickerUpper} is not in your ${watchlistName}`,
            data: watchlist
          }
        }

        // Remove ticker from watchlist
        const updatedTickers = watchlist.tickers.filter((t: string) => t !== tickerUpper)
        
        const { data: updatedWatchlist, error: updateError } = await supabase
          .from('user_watchlists')
          .update({ 
            tickers: updatedTickers,
            updated_at: new Date().toISOString()
          })
          .eq('id', watchlist.id)
          .select()
          .single()

        if (updateError) {
          throw new Error(`Database error updating watchlist: ${updateError.message}`)
        }

        return {
          type: 'removed',
          message: `${tickerUpper} removed from ${watchlistName}!`,
          data: updatedWatchlist
        }
      },
      3, // max retries
      1000, // initial delay
      'Remove ticker from watchlist'
    )

    return apiSuccess(result.data, result.message)
  } catch (error) {
    console.error('Error in DELETE /api/watchlist:', error)
    
    if (error instanceof Error) {
      if (error.message === 'WATCHLIST_NOT_FOUND') {
        return apiError('Watchlist not found', 404, null, 'WATCHLIST_NOT_FOUND')
      }
      
      if (error.message.includes('Database error')) {
        return apiError('Failed to update watchlist in database', 500, error.message, 'DATABASE_ERROR')
      }
    }
    
    return apiError('Failed to remove ticker from watchlist', 500, error instanceof Error ? error.message : error)
  }
})
