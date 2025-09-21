import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface AddToWatchlistRequest {
  ticker: string
  watchlist_name?: string
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

    // Get user's watchlists
    const { data: watchlists, error } = await supabase
      .from('user_watchlists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching watchlists:', error)
      return NextResponse.json(
        { error: 'Failed to fetch watchlists' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: watchlists || [] })
  } catch (error) {
    console.error('Error in watchlist GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const body: AddToWatchlistRequest = await request.json()
    
    if (!body.ticker) {
      return NextResponse.json(
        { error: 'Ticker is required' },
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

    const ticker = body.ticker.toUpperCase().trim()
    const watchlistName = body.watchlist_name || 'Default Watchlist'

    // Check if user has a default watchlist or the specified watchlist
    const { data: existingWatchlist, error: fetchError } = await supabase
      .from('user_watchlists')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', watchlistName)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking existing watchlist:', fetchError)
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      )
    }

    if (existingWatchlist) {
      // Check if ticker already exists in watchlist
      if (existingWatchlist.tickers.includes(ticker)) {
        return NextResponse.json(
          { message: `${ticker} is already in your ${watchlistName}` },
          { status: 200 }
        )
      }

      // Add ticker to existing watchlist
      const updatedTickers = [...existingWatchlist.tickers, ticker]
      
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
        console.error('Error updating watchlist:', updateError)
        return NextResponse.json(
          { error: 'Failed to add ticker to watchlist' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: updatedWatchlist,
        message: `${ticker} added to ${watchlistName}!`
      })
    } else {
      // Create new watchlist with the ticker
      const { data: newWatchlist, error: createError } = await supabase
        .from('user_watchlists')
        .insert([
          {
            user_id: user.id,
            name: watchlistName,
            description: watchlistName === 'Default Watchlist' ? 'My default watchlist' : undefined,
            tickers: [ticker],
            is_default: watchlistName === 'Default Watchlist'
          }
        ])
        .select()
        .single()

      if (createError) {
        console.error('Error creating watchlist:', createError)
        return NextResponse.json(
          { error: 'Failed to create watchlist' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: newWatchlist,
        message: `Created ${watchlistName} and added ${ticker}!`
      }, { status: 201 })
    }
  } catch (error) {
    console.error('Error in watchlist POST:', error)
    
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
    const ticker = searchParams.get('ticker')
    const watchlistName = searchParams.get('watchlist_name') || 'Default Watchlist'

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker is required' },
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

    const tickerUpper = ticker.toUpperCase().trim()

    // Find the watchlist
    const { data: watchlist, error: fetchError } = await supabase
      .from('user_watchlists')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', watchlistName)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Watchlist not found' },
        { status: 404 }
      )
    }

    // Remove ticker from watchlist
    const updatedTickers = watchlist.tickers.filter(t => t !== tickerUpper)
    
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
      console.error('Error updating watchlist:', updateError)
      return NextResponse.json(
        { error: 'Failed to remove ticker from watchlist' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: updatedWatchlist,
      message: `${tickerUpper} removed from ${watchlistName}!`
    })
  } catch (error) {
    console.error('Error in watchlist DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
