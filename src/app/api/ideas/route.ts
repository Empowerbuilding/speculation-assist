import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { apiSuccess, apiError, withRetry, TradingIdea } from '@/lib/api-helpers'

// Function to parse combined trading ideas from a single database row
function parseCombinedIdeas(combinedData: { id: number; created_at: string; analysis: string; tickers: string }): TradingIdea[] {
  const { id, created_at, analysis, tickers } = combinedData
  
  // Split analysis by "---" separator
  const analysisParts = analysis.split('---')
  
  // Split tickers by "---" separator  
  const tickerGroups = tickers.split('---')
  
  const parsedIdeas: TradingIdea[] = []
  
  analysisParts.forEach((part: string, index: number) => {
    const trimmedPart = part.trim()
    if (!trimmedPart) {
      return
    }
    
    // Extract theme from "IDEA X - [theme]" pattern
    const themeMatch = trimmedPart.match(/^IDEA\s+\d+\s*-\s*(.+?)$/m)
    if (!themeMatch) {
      return
    }
    
    const theme = themeMatch[1].trim()
    
    // Extract analysis content (everything after the theme line, excluding ticker lines)
    const lines = trimmedPart.split('\n')
    const contentLines = lines.slice(1) // Skip the "IDEA X - theme" line
    
    // Filter out lines that look like ticker lists (contain only uppercase letters, commas, spaces)
    const analysisLines = contentLines.filter(line => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return false
      // Skip lines that are just ticker symbols (all caps, commas, spaces)
      return !/^[A-Z\s,]+$/.test(trimmedLine) || trimmedLine.length > 50
    })
    
    const analysisContent = analysisLines.join('\n').trim()
    
    // Get corresponding ticker group and clean it up
    let tickerGroup = tickerGroups[index]?.trim() || ''
    // Remove leading comma and extra whitespace/newlines
    tickerGroup = tickerGroup.replace(/^,\s*/, '').replace(/\s+/g, ' ').trim()
    
    if (theme && analysisContent) {
      const newIdea = {
        id: id + index, // Create unique IDs
        created_at,
        theme,
        analysis: analysisContent,
        tickers: tickerGroup
      }
      parsedIdeas.push(newIdea)
    }
  })
  
  return parsedIdeas
}

export async function GET() {
  try {
    let ideas: { id: number; created_at: string; analysis: string; tickers: string }[] | null = null

    // Wrap database operation with retry logic
    try {
      ideas = await withRetry(
        async () => {
          const supabase = await createClient()
          
          const { data, error } = await supabase
            .from('generated_ideas')
            .select('id, created_at, theme, analysis, tickers')
            .order('created_at', { ascending: false })
            .limit(10)
          
          if (error) {
            throw new Error(`Database error: ${error.message}`)
          }
          
          return data
        },
        3, // max retries
        1000, // initial delay
        'Fetch trading ideas'
      )
    } catch (supabaseError) {
      console.error('Database operation failed after retries:', supabaseError)
      // Continue to mock data fallback
    }

    if (!ideas || ideas.length === 0) {
      console.log('No ideas found in database, returning mock data')
      
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
      
      return apiSuccess(mockIdeas, 'Returned mock trading ideas')
    }

    let processedIdeas: TradingIdea[] = []

    // Check if data contains combined format (has "IDEA 1" and "---")
    const hasCombinedFormat = ideas.some(idea => 
      idea.analysis && 
      idea.analysis.includes('IDEA 1') && 
      idea.analysis.includes('---')
    )

    if (hasCombinedFormat) {
      console.log('Processing combined format ideas')
      // Parse combined format - typically the first row contains all combined data
      const combinedRow = ideas.find(idea => 
        idea.analysis && 
        idea.analysis.includes('IDEA 1') && 
        idea.analysis.includes('---')
      )
      
      if (combinedRow) {
        processedIdeas = parseCombinedIdeas(combinedRow)
      }
    } else {
      console.log('Using individual format ideas')
      // Use individual rows as-is
      processedIdeas = ideas as TradingIdea[]
    }

    // Limit final result to 3 ideas for display
    const finalIdeas = processedIdeas.slice(0, 3)
    
    console.log(`Returning ${finalIdeas.length} trading ideas`)
    return apiSuccess(finalIdeas, `Retrieved ${finalIdeas.length} trading ideas`)
  } catch (error) {
    console.error('Error in GET /api/ideas:', error)
    return apiError(
      'Failed to fetch trading ideas', 
      500, 
      error instanceof Error ? error.message : error,
      'FETCH_IDEAS_ERROR'
    )
  }
}
