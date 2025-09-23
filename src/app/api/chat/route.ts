/**
 * OpenAI Chat API Route
 * 
 * Required Environment Variables:
 * - OPENAI_API_KEY: Your OpenAI API key
 * - SERPAPI_KEY: Your SerpApi key for stock research (optional)
 * 
 * Features:
 * - User authentication required
 * - Rate limiting (10 requests per minute per user)
 * - Trading context support (ideas, watchlist, user profile)
 * - Input validation and sanitization
 * - Error handling with fallback responses
 * - Usage tracking and monitoring
 */

import { NextRequest } from 'next/server'
import OpenAI from 'openai'
// Dynamic import for SerpApi will be used in the function
import { 
  withAuth, 
  apiSuccess, 
  apiError, 
  validateBody, 
  withRetry,
  validators 
} from '@/lib/api-helpers'
import { User } from '@supabase/supabase-js'

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 10, // requests per window
  windowMs: 60 * 1000, // 1 minute
}

// OpenAI client initialization
let openai: OpenAI | null = null

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openai = new OpenAI({ apiKey })
  }
  return openai
}

// Message interface
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// Request interface
interface ChatRequest {
  messages: ChatMessage[]
  tradingContext?: {
    idea?: {
      id: number
      theme: string
      analysis: string
      tickers: string
    }
    watchlist?: string[]
    userProfile?: {
      riskTolerance?: string
      investmentGoals?: string
    }
  }
  maxTokens?: number
  temperature?: number
}

// Validation function
function isValidChatRequest(body: unknown): body is ChatRequest {
  if (!validators.isObject(body)) return false
  
  const requestBody = body as Record<string, unknown>
  
  // Validate messages array
  if (!validators.isArray(requestBody.messages) || requestBody.messages.length === 0) return false
  
  // Validate each message
  for (const message of requestBody.messages) {
    if (!validators.isObject(message)) return false
    const msg = message as Record<string, unknown>
    if (!validators.isString(msg.content) || !msg.content.trim()) return false
    if (!['user', 'assistant', 'system'].includes(msg.role as string)) return false
  }
  
  // Validate optional fields
  if (requestBody.maxTokens !== undefined && !validators.isNumber(requestBody.maxTokens)) return false
  if (requestBody.temperature !== undefined && !validators.isNumber(requestBody.temperature)) return false
  
  // Validate trading context if provided
  if (requestBody.tradingContext !== undefined) {
    if (!validators.isObject(requestBody.tradingContext)) return false
    
    const context = requestBody.tradingContext as Record<string, unknown>
    
    if (context.idea !== undefined) {
      if (!validators.isObject(context.idea)) return false
      const idea = context.idea as Record<string, unknown>
      if (!validators.isNumber(idea.id)) return false
      if (!validators.isNonEmptyString(idea.theme)) return false
      if (!validators.isNonEmptyString(idea.analysis)) return false
      if (!validators.isNonEmptyString(idea.tickers)) return false
    }
    
    if (context.watchlist !== undefined) {
      if (!validators.isArray(context.watchlist)) return false
      for (const ticker of context.watchlist) {
        if (!validators.isString(ticker)) return false
      }
    }
  }
  
  return true
}

// Rate limiting function
function checkRateLimit(userId: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now()
  const userLimit = rateLimitStore.get(userId)
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize rate limit
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs
    })
    return { allowed: true }
  }
  
  if (userLimit.count >= RATE_LIMIT.maxRequests) {
    return { allowed: false, resetTime: userLimit.resetTime }
  }
  
  // Increment count
  userLimit.count++
  return { allowed: true }
}

// System prompt builder
function buildSystemPrompt(tradingContext?: ChatRequest['tradingContext'], researchData?: string): string {
  let basePrompt = `You are an AI trading assistant for SpeculationAssist with research capabilities. Your role is to help users with:

1. Trading ideas and stock analysis
2. Market insights and trends
3. Watchlist management and optimization
4. Risk management and investment strategies
5. Educational content about trading and investing

CRITICAL FINANCIAL DATA GUIDELINES:
- You do NOT have real-time access to stock prices, market caps, or financial data
- NEVER provide specific financial figures (prices, market caps, volumes) unless from recent research data
- When users ask for current prices or financial metrics, ALWAYS state you don't have real-time access
- If providing any financial data, ALWAYS include timestamp and recommend verification from official sources
- NEVER guess or provide outdated financial information
- Always direct users to verify financial data with real-time sources like Yahoo Finance, Bloomberg, or their broker

General Guidelines:
- Provide helpful, accurate, and actionable trading insights
- Always include appropriate risk disclaimers
- Be conversational but professional
- Focus on education and helping users make informed decisions
- Never guarantee returns or provide financial advice as a licensed advisor
- Encourage users to do their own research and consider their risk tolerance

Important: Always include a disclaimer that your responses are for educational purposes only and not personalized financial advice.`

  if (tradingContext?.idea) {
    const { theme, analysis, tickers } = tradingContext.idea
    basePrompt += `\n\nCurrent Trading Idea Context:
Theme: ${theme}
Analysis: ${analysis}
Tickers: ${tickers}

Use this context to provide more specific and relevant responses about this particular trading opportunity.`
  }

  if (tradingContext?.watchlist && tradingContext.watchlist.length > 0) {
    basePrompt += `\n\nUser's Current Watchlist: ${tradingContext.watchlist.join(', ')}
Consider these holdings when providing portfolio advice or suggesting complementary investments.`
  }

  if (tradingContext?.userProfile) {
    const { riskTolerance, investmentGoals } = tradingContext.userProfile
    if (riskTolerance) {
      basePrompt += `\n\nUser's Risk Tolerance: ${riskTolerance}`
    }
    if (investmentGoals) {
      basePrompt += `\n\nUser's Investment Goals: ${investmentGoals}`
    }
  }

  if (researchData && researchData.length > 0) {
    basePrompt += `\n\nCurrent Research Information:\n${researchData}\n\nIMPORTANT: Use this research data to provide analysis, but ALWAYS:\n1. Include timestamps when discussing financial data\n2. Recommend users verify current prices with real-time sources\n3. Add disclaimers about data accuracy and timing\n4. Never present research data as guaranteed current prices`
  }

  return basePrompt
}

// Input sanitization
function sanitizeMessage(message: ChatMessage): ChatMessage {
  return {
    ...message,
    content: message.content.trim().slice(0, 2000) // Limit message length
  }
}

// Enhanced stock research function using SerpApi
async function performStockResearch(query: string): Promise<string> {
  try {
    if (!process.env.SERPAPI_KEY) {
      return 'Research functionality not configured. Please verify financial data with real-time sources like Yahoo Finance or your broker.'
    }

    // Dynamic import to avoid require() in ES modules
    const { getJson } = await import('serpapi')
    
    // Enhanced search patterns for better financial data
    const financialSearchQueries = [
      `${query} stock price market cap yahoo finance marketwatch today`,
      `${query} current price financial data bloomberg reuters`,
      `${query} shares outstanding market value nasdaq NYSE`
    ]
    
    let allResults: any[] = []
    
    // Try multiple search patterns for better data coverage
    for (const searchQuery of financialSearchQueries) {
      try {
        const searchParams = {
          engine: 'google',
          q: searchQuery,
          location: "United States",
          hl: "en",
          gl: "us",
          num: 8,
          api_key: process.env.SERPAPI_KEY
        }
        
        const results = await getJson(searchParams)
        const organicResults = results.organic_results || []
        
        // Filter for high-quality financial sources
        const financialSources = organicResults.filter((result: any) => {
          const url = result.link?.toLowerCase() || ''
          const title = result.title?.toLowerCase() || ''
          return (
            url.includes('yahoo.com') ||
            url.includes('marketwatch.com') ||
            url.includes('bloomberg.com') ||
            url.includes('reuters.com') ||
            url.includes('nasdaq.com') ||
            url.includes('sec.gov') ||
            url.includes('finviz.com') ||
            url.includes('morningstar.com') ||
            title.includes('stock price') ||
            title.includes('market cap') ||
            title.includes('financial')
          )
        })
        
        allResults = [...allResults, ...financialSources]
        
        // Break if we have enough quality results
        if (allResults.length >= 6) break
        
        // Add delay between searches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (searchError) {
        console.warn(`Search query failed: ${searchQuery}`, searchError)
        continue
      }
    }
    
    if (allResults.length === 0) {
      return `No recent financial information found for ${query}. Please verify current data with real-time sources like Yahoo Finance, Bloomberg, or your broker.`
    }

    interface SearchResult {
      title: string
      snippet: string
      link?: string
    }

    // Remove duplicates and get best results
    const uniqueResults = allResults
      .filter((result, index, self) => 
        index === self.findIndex(r => r.title === result.title)
      )
      .slice(0, 5)
    
    const timestamp = new Date().toISOString()
    const researchSummary = uniqueResults
      .map((result: SearchResult) => {
        const source = result.link ? new URL(result.link).hostname : 'Unknown source'
        return `• ${result.title}\n  ${result.snippet}\n  Source: ${source}`
      })
      .join('\n\n')
    
    return `Recent research results for ${query} (Timestamp: ${timestamp}):\n\n${researchSummary}\n\n⚠️ IMPORTANT: This data may not be real-time. Always verify current prices and financial metrics with official sources like Yahoo Finance, Bloomberg, or your broker before making investment decisions.`
    
  } catch (error) {
    console.error('Research failed:', error)
    return `Unable to research ${query} at this time. Please check current financial data directly with Yahoo Finance, Bloomberg, or your broker.`
  }
}

// POST handler
export const POST = withAuth(async (user: User, request: NextRequest) => {
  try {
    // Rate limiting check
    const rateLimitResult = checkRateLimit(user.id)
    if (!rateLimitResult.allowed) {
      const resetTime = rateLimitResult.resetTime || Date.now()
      const waitTime = Math.ceil((resetTime - Date.now()) / 1000)
      return apiError(
        `Rate limit exceeded. Please try again in ${waitTime} seconds.`,
        429,
        { resetTime, waitTime },
        'RATE_LIMIT_EXCEEDED'
      )
    }

    // Validate request body
    const validation = await validateBody(
      request,
      isValidChatRequest,
      'Invalid chat request. Please provide a valid messages array.'
    )

    if (!validation.success) {
      return validation.response
    }

    const { messages, tradingContext, maxTokens = 500, temperature = 0.7 }: ChatRequest = validation.data

    // Sanitize messages
    const sanitizedMessages = messages.map(sanitizeMessage)

    // Enhanced financial query detection with specific patterns
    const lastMessage = sanitizedMessages[sanitizedMessages.length - 1]
    const messageContent = lastMessage.content.toLowerCase()
    
    // Specific financial data patterns that ALWAYS trigger research
    const criticalFinancialPatterns = [
      /what\s+is\s+.*?market\s+cap/i,
      /current\s+price\s+of/i,
      /stock\s+price\s+of/i,
      /price\s+of\s+.*?stock/i,
      /market\s+cap\s+of/i,
      /how\s+much\s+is\s+.*?worth/i,
      /shares\s+outstanding/i,
      /market\s+value\s+of/i,
      /valuation\s+of/i
    ]
    
    // Check for critical financial patterns first
    const isCriticalFinancialQuery = criticalFinancialPatterns.some(pattern => 
      pattern.test(messageContent)
    )
    
    // Comprehensive research keywords
    const researchKeywords = [
      // Basic research terms
      'research', 'look up', 'tell me about', 'analyze', 'what is', 'find out about', 'information',
      
      // Financial metrics (HIGH PRIORITY)
      'current price', 'stock price', 'share price', 'market cap', 'market capitalization', 
      'shares outstanding', 'float', 'volume', 'market value', 'valuation', 'worth',
      
      // Financial statements
      'revenue', 'earnings', 'profit', 'income', 'sales', 'eps', 'earnings per share',
      'cash flow', 'debt', 'balance sheet', 'assets', 'liabilities', 'book value',
      
      // Performance metrics
      'pe ratio', 'p/e', 'price to earnings', 'dividend', 'dividend yield', 'growth',
      'return on equity', 'roe', 'margins', 'profit margin', 'gross margin',
      
      // News and events
      'latest news', 'recent news', 'press release', 'announcement', 'filing',
      'sec filing', '10-k', '10-q', 'quarterly report', 'annual report',
      
      // Trading info
      '52 week high', '52 week low', 'all time high', 'all time low', 'beta',
      'volatility', 'moving average', 'support', 'resistance', 'chart',
      
      // Company info
      'ceo', 'headquarters', 'employees', 'founded', 'sector', 'industry',
      'competitors', 'business model', 'products', 'services',
      
      // Investment terms
      'buy rating', 'sell rating', 'analyst rating', 'price target', 'upgrade',
      'downgrade', 'recommendation', 'forecast', 'guidance', 'outlook',
      
      // Additional query terms
      'could', 'would', 'might', 'potential', 'benefit', 'gain', 'exposed', 'part of', 'involved in'
    ]
    
    const hasResearchKeywords = researchKeywords.some(keyword => 
      messageContent.includes(keyword.toLowerCase())
    )
    
    // Trigger research for critical financial queries OR general research requests
    const isResearchRequest = isCriticalFinancialQuery || hasResearchKeywords
    
    let researchData = ''
    
    // Add debug logging
    console.log(`Message: "${lastMessage.content}"`)
    console.log(`Critical financial query: ${isCriticalFinancialQuery}`)
    console.log(`Research request detected: ${isResearchRequest}`)
    
    if (isResearchRequest) {
      console.log('Triggering research...')
      
      // Enhanced ticker extraction - look for any ticker in the message first
      const tickerMatch = lastMessage.content.match(/\b[A-Z]{2,6}\b/g)
      let primaryTicker = null
      
      // Filter out common words that aren't tickers
      if (tickerMatch) {
        const commonWords = ['THE', 'AND', 'FOR', 'ARE', 'YOU', 'ALL', 'CAN', 'HAD', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'USE', 'MAN', 'NEW', 'NOW', 'WAY', 'MAY', 'SAY', 'EACH', 'WHICH', 'SHE', 'HOW', 'ITS', 'WHO', 'OIL', 'SIT', 'BUT', 'NOT', 'WHAT', 'SOME', 'TIME', 'VERY', 'WHEN', 'MUCH', 'TAKE', 'THEM', 'WELL', 'WERE', 'ALSO', 'MORE', 'OVER', 'SUCH', 'INTO', 'THAN', 'ONLY', 'COME', 'WORK', 'YEAR', 'BACK', 'WANT', 'MADE', 'MOST', 'GOOD', 'MAKE', 'KNOW', 'WILL', 'PART', 'JUST', 'LIKE', 'DONT', 'CANT', 'WONT', 'THIS', 'THAT', 'WITH', 'HAVE', 'FROM', 'THEY', 'BEEN', 'SAID', 'WOULD', 'THERE', 'COULD', 'WHERE', 'THESE', 'THOSE', 'ABOUT', 'AFTER', 'FIRST', 'NEVER', 'OTHER', 'RIGHT', 'THINK', 'BEFORE', 'DURING', 'WHILE', 'SINCE', 'STILL', 'STOCK', 'PRICE', 'POLA', 'WHAT', 'MUCH', 'DOES', 'HAVE', 'MANY']
        
        primaryTicker = tickerMatch.find(ticker => 
          !commonWords.includes(ticker.toUpperCase()) && 
          ticker.length >= 2 && 
          ticker.length <= 6 &&
          /^[A-Z]+$/.test(ticker) // Only letters, no numbers
        )
      }
      
      if (primaryTicker) {
        console.log(`Researching ticker: ${primaryTicker}`)
        researchData = await performStockResearch(primaryTicker)
      } else {
        // Enhanced company name extraction patterns
        const companyPatterns = [
          /(?:tell me about|analyze|research|information (?:on|about))\s+(.+?)(?:\s|$|\?)/i,
          /(?:what is|find out about)\s+(?:the\s+)?(.+?)(?:\s|$|\?)/i,
          /(?:current price|stock price|market cap|shares outstanding|market value).*?(?:of|for)\s+(.+?)(?:\s|$|\?)/i,
          /(?:how much is)\s+(.+?)\s+(?:worth|stock)/i,
          /(?:could|would)\s+(?:the\s+)?(?:stock\s+)?([A-Z]{2,6})\s+/i,
          /(?:stock\s+)([A-Z]{2,6})(?:\s|$)/i,
          /([A-Z]{2,6})\s+(?:stock|price|market cap)/i
        ]
        
        for (const pattern of companyPatterns) {
          const match = lastMessage.content.match(pattern)
          if (match) {
            let searchTerm = match[1].trim()
            // Clean up the search term
            searchTerm = searchTerm.replace(/\s+(stock|ticker|symbol|company|corporation|inc|corp|ltd)$/i, '')
            searchTerm = searchTerm.replace(/^(the|a|an)\s+/i, '')
            
            if (searchTerm.length >= 2) {
              console.log(`Researching company/ticker: ${searchTerm}`)
              researchData = await performStockResearch(searchTerm)
              break
            }
          }
        }
        
        // If still no results, try extracting any potential ticker or company name
        if (!researchData && isCriticalFinancialQuery) {
          const commonWords = ['THE', 'AND', 'FOR', 'ARE', 'YOU', 'ALL', 'CAN', 'HAD', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'USE', 'MAN', 'NEW', 'NOW', 'WAY', 'MAY', 'SAY', 'EACH', 'WHICH', 'SHE', 'HOW', 'ITS', 'WHO', 'OIL', 'SIT', 'BUT', 'NOT', 'WHAT', 'SOME', 'TIME', 'VERY', 'WHEN', 'MUCH', 'TAKE', 'THEM', 'WELL', 'WERE', 'ALSO', 'MORE', 'OVER', 'SUCH', 'INTO', 'THAN', 'ONLY', 'COME', 'WORK', 'YEAR', 'BACK', 'WANT', 'MADE', 'MOST', 'GOOD', 'MAKE', 'KNOW', 'WILL', 'PART', 'JUST', 'LIKE', 'DONT', 'CANT', 'WONT', 'THIS', 'THAT', 'WITH', 'HAVE', 'FROM', 'THEY', 'BEEN', 'SAID', 'WOULD', 'THERE', 'COULD', 'WHERE', 'THESE', 'THOSE', 'ABOUT', 'AFTER', 'FIRST', 'NEVER', 'OTHER', 'RIGHT', 'THINK', 'BEFORE', 'DURING', 'WHILE', 'SINCE', 'STILL', 'STOCK', 'PRICE', 'POLA', 'WHAT', 'MUCH', 'DOES', 'HAVE', 'MANY']
          const words = lastMessage.content.split(/\s+/)
          for (const word of words) {
            const cleanWord = word.replace(/[^A-Za-z]/g, '')
            if (cleanWord.length >= 2 && cleanWord.length <= 6 && /^[A-Z]+$/i.test(cleanWord)) {
              const upperWord = cleanWord.toUpperCase()
              if (!commonWords.includes(upperWord)) {
                console.log(`Fallback research for potential ticker: ${upperWord}`)
                researchData = await performStockResearch(upperWord)
                break
              }
            }
          }
        }
      }
      
      console.log(`Research data length: ${researchData.length}`)
    }

    // Validate message count
    if (sanitizedMessages.length > 20) {
      return apiError(
        'Too many messages in conversation. Please start a new chat.',
        400,
        null,
        'MESSAGE_LIMIT_EXCEEDED'
      )
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(tradingContext, researchData)

    // Prepare messages for OpenAI
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...sanitizedMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ]

    // Get OpenAI client
    let openaiClient: OpenAI
    try {
      openaiClient = getOpenAIClient()
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error)
      return apiError(
        'AI service is currently unavailable. Please try again later.',
        503,
        null,
        'OPENAI_UNAVAILABLE'
      )
    }

    // Call OpenAI API with retry logic
    const completion = await withRetry(
      async () => {
        return await openaiClient.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: openaiMessages,
          max_tokens: Math.min(maxTokens, 1000), // Cap at 1000 tokens
          temperature: Math.max(0, Math.min(temperature, 1)), // Clamp between 0-1
          presence_penalty: 0.1,
          frequency_penalty: 0.1,
          user: user.id // For OpenAI usage tracking
        })
      },
      3, // max retries
      1000, // initial delay
      'OpenAI API call'
    )

    // Extract response
    const assistantMessage = completion.choices[0]?.message
    if (!assistantMessage?.content) {
      return apiError(
        'AI service returned an empty response. Please try again.',
        500,
        null,
        'EMPTY_RESPONSE'
      )
    }

    // Log usage for monitoring (in production, consider async logging)
    console.log(`Chat API usage - User: ${user.id}, Tokens: ${completion.usage?.total_tokens || 'unknown'}`)

    // Return successful response
    return apiSuccess({
      message: {
        role: 'assistant',
        content: assistantMessage.content,
        timestamp: new Date().toISOString()
      },
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0
      },
      model: completion.model
    }, 'Chat response generated successfully')

  } catch (error) {
    console.error('Error in POST /api/chat:', error)

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return apiError(
          'AI service authentication failed.',
          500,
          null,
          'OPENAI_AUTH_ERROR'
        )
      } else if (error.status === 429) {
        return apiError(
          'AI service is currently busy. Please try again in a moment.',
          429,
          null,
          'OPENAI_RATE_LIMIT'
        )
      } else if (error.status === 400) {
        return apiError(
          'Invalid request to AI service. Please check your message format.',
          400,
          null,
          'OPENAI_BAD_REQUEST'
        )
      }
    }

    // Generic error handling
    return apiError(
      'Failed to generate AI response. Please try again.',
      500,
      error instanceof Error ? error.message : error,
      'CHAT_ERROR'
    )
  }
})

// GET handler for testing/health check
export async function GET() {
  try {
    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return apiError(
        'OpenAI API key is not configured',
        500,
        null,
        'MISSING_API_KEY'
      )
    }

    return apiSuccess({
      status: 'healthy',
      model: 'gpt-3.5-turbo',
      rateLimit: RATE_LIMIT,
      timestamp: new Date().toISOString()
    }, 'Chat API is operational')
  } catch (error) {
    return apiError(
      'Chat API health check failed',
      500,
      error instanceof Error ? error.message : error,
      'HEALTH_CHECK_FAILED'
    )
  }
}
