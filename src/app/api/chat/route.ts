/**
 * N8N Agent Chat API Route
 * 
 * Required Environment Variables:
 * - N8N_AGENT_WEBHOOK_URL: Your N8N agent webhook URL
 * 
 * Features:
 * - User authentication required
 * - Rate limiting (10 requests per minute per user)
 * - Trading context support (ideas, watchlist, user profile)
 * - Input validation and sanitization
 * - Error handling with fallback responses
 * - N8N agent integration for financial research
 */

import { NextRequest } from 'next/server'
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

// N8N Agent integration
async function callN8NAgent(userMessage: string, tradingContext: any): Promise<string> {
  try {
    const response = await fetch(process.env.N8N_AGENT_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: userMessage,
        context: tradingContext 
      })
    })
    
    if (!response.ok) {
      throw new Error(`N8N agent responded with status: ${response.status}`)
    }
    
    return await response.text()
  } catch (error) {
    console.error('N8N agent call failed:', error)
    return 'I apologize, but I cannot access current financial data right now. Please try again or check financial websites directly.'
  }
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


// Input sanitization
function sanitizeMessage(message: ChatMessage): ChatMessage {
  return {
    ...message,
    content: message.content.trim().slice(0, 2000) // Limit message length
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

    // Get the last message for N8N agent processing
    const lastMessage = sanitizedMessages[sanitizedMessages.length - 1]

    // Validate message count
    if (sanitizedMessages.length > 20) {
      return apiError(
        'Too many messages in conversation. Please start a new chat.',
        400,
        null,
        'MESSAGE_LIMIT_EXCEEDED'
      )
    }

    // Call N8N agent with user message and trading context
    const agentResponse = await callN8NAgent(lastMessage.content, tradingContext)
    
    if (!agentResponse) {
      return apiError(
        'Agent service returned an empty response. Please try again.',
        500,
        null,
        'EMPTY_RESPONSE'
      )
    }

    // Log usage for monitoring (in production, consider async logging)
    console.log(`N8N Agent API usage - User: ${user.id}`)

    // Return successful response
    return apiSuccess({
      message: {
        role: 'assistant',
        content: agentResponse,
        timestamp: new Date().toISOString()
      },
      model: 'n8n-agent'
    }, 'Chat response generated successfully')

  } catch (error) {
    console.error('Error in POST /api/chat:', error)

    // Generic error handling
    return apiError(
      'Failed to generate agent response. Please try again.',
      500,
      error instanceof Error ? error.message : error,
      'CHAT_ERROR'
    )
  }
})

// GET handler for testing/health check
export async function GET() {
  try {
    // Check if N8N webhook URL is configured
    const webhookUrl = process.env.N8N_AGENT_WEBHOOK_URL
    if (!webhookUrl) {
      return apiError(
        'N8N agent webhook URL is not configured',
        500,
        null,
        'MISSING_WEBHOOK_URL'
      )
    }

    return apiSuccess({
      status: 'healthy',
      model: 'n8n-agent',
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
