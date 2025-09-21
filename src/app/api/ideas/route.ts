import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export interface TradingIdea {
  id: number
  created_at: string
  theme: string
  analysis: string
  tickers: string
}

interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export async function GET(): Promise<NextResponse<ApiResponse<TradingIdea[]>>> {
  try {
    const supabase = await createClient()
    
    const { data: ideas, error } = await supabase
      .from('generated_ideas')
      .select('id, created_at, theme, analysis, tickers')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      )
    }

    if (!ideas || ideas.length === 0) {
      // Return mock data if no ideas in database yet
      const mockIdeas: TradingIdea[] = [
        {
          id: 1,
          theme: 'Tech Sector Momentum',
          analysis: 'Strong technical breakout in major tech stocks with high volume. AI and semiconductor sectors showing particular strength with institutional buying pressure.',
          tickers: 'AAPL, NVDA, MSFT',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          theme: 'EV Market Volatility',
          analysis: 'Electric vehicle stocks showing mixed signals. Recent earnings reports and regulatory changes creating uncertainty, but long-term outlook remains positive.',
          tickers: 'TSLA, RIVN, LCID',
          created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        },
        {
          id: 3,
          theme: 'Financial Sector Rotation',
          analysis: 'Banking and financial services benefiting from interest rate environment. Strong earnings and improved lending conditions driving sector performance.',
          tickers: 'JPM, BAC, GS, WFC',
          created_at: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
        }
      ]
      
      return NextResponse.json({ data: mockIdeas })
    }

    return NextResponse.json({ data: ideas })
  } catch (error) {
    console.error('Error fetching trading ideas:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trading ideas' },
      { status: 500 }
    )
  }
}
