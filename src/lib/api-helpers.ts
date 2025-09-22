import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { User } from '@supabase/supabase-js'

// Standard API response types
export interface ApiSuccessResponse<T = any> {
  data: T
  message?: string
}

export interface ApiErrorResponse {
  error: string
  details?: any
  code?: string
}

// Success response helper
export function apiSuccess<T>(data: T, message?: string, status: number = 200): NextResponse {
  const response: ApiSuccessResponse<T> = { data }
  if (message) response.message = message
  
  return NextResponse.json(response, { status })
}

// Error response helper
export function apiError(
  error: string, 
  status: number = 500, 
  details?: any, 
  code?: string
): NextResponse {
  const response: ApiErrorResponse = { error }
  if (details) response.details = details
  if (code) response.code = code
  
  console.error(`API Error [${status}]:`, error, details || '')
  
  return NextResponse.json(response, { status })
}

// Authentication wrapper
export function withAuth<T extends any[]>(
  handler: (user: User, ...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        console.error('Auth error:', authError)
        return apiError('Authentication failed', 401, authError)
      }

      if (!user) {
        return apiError('Unauthorized - no user found', 401)
      }

      return await handler(user, ...args)
    } catch (error) {
      console.error('Auth wrapper error:', error)
      return apiError('Authentication error', 500, error instanceof Error ? error.message : error)
    }
  }
}

// Request body validation helper
export async function validateBody<T>(
  request: NextRequest,
  validator: (body: any) => body is T,
  errorMessage: string = 'Invalid request body'
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json()
    
    if (!validator(body)) {
      return {
        success: false,
        response: apiError(errorMessage, 400, { receivedBody: body })
      }
    }
    
    return { success: true, data: body }
  } catch (error) {
    return {
      success: false,
      response: apiError('Invalid JSON in request body', 400, error instanceof Error ? error.message : error)
    }
  }
}

// Retry wrapper for database operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  operationName: string = 'Database operation'
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[RETRY] ${operationName} - Attempt ${attempt}/${maxRetries}`)
      const result = await operation()
      
      if (attempt > 1) {
        console.log(`[RETRY] ${operationName} - Succeeded on attempt ${attempt}`)
      }
      
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(`[RETRY] ${operationName} - Attempt ${attempt} failed:`, lastError.message)
      
      if (attempt === maxRetries) {
        console.error(`[RETRY] ${operationName} - All ${maxRetries} attempts failed`)
        break
      }
      
      // Wait before retrying (exponential backoff)
      const delay = delayMs * Math.pow(2, attempt - 1)
      console.log(`[RETRY] ${operationName} - Waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`)
}

// Common validation functions
export const validators = {
  isString: (value: any): value is string => typeof value === 'string',
  isNumber: (value: any): value is number => typeof value === 'number',
  isBoolean: (value: any): value is boolean => typeof value === 'boolean',
  isObject: (value: any): value is object => typeof value === 'object' && value !== null && !Array.isArray(value),
  isArray: (value: any): value is any[] => Array.isArray(value),
  isEmail: (value: any): value is string => 
    typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  hasKeys: <T extends string>(obj: any, keys: T[]): obj is Record<T, any> =>
    typeof obj === 'object' && obj !== null && keys.every(key => key in obj),
  isNonEmptyString: (value: any): value is string => 
    typeof value === 'string' && value.trim().length > 0
}

// Profile update validation
export interface ProfileUpdateRequest {
  first_name?: string
  last_name?: string
  display_name?: string
  avatar_url?: string
  preferences?: {
    email_notifications?: boolean
    push_notifications?: boolean
    marketing_emails?: boolean
    daily_digest?: boolean
  }
}

export function isValidProfileUpdate(body: any): body is ProfileUpdateRequest {
  if (!validators.isObject(body)) return false
  
  const validFields = ['first_name', 'last_name', 'display_name', 'avatar_url', 'preferences']
  const bodyKeys = Object.keys(body)
  
  // Check that all keys are valid
  if (!bodyKeys.every(key => validFields.includes(key))) {
    return false
  }
  
  // Validate string fields if present
  const stringFields = ['first_name', 'last_name', 'display_name', 'avatar_url']
  for (const field of stringFields) {
    if (body[field] !== undefined && !validators.isString(body[field])) {
      return false
    }
  }
  
  // Validate preferences if present
  if (body.preferences !== undefined) {
    if (!validators.isObject(body.preferences)) return false
    
    const prefKeys = Object.keys(body.preferences)
    const validPrefKeys = ['email_notifications', 'push_notifications', 'marketing_emails', 'daily_digest']
    
    if (!prefKeys.every(key => validPrefKeys.includes(key))) {
      return false
    }
    
    for (const key of prefKeys) {
      if (!validators.isBoolean(body.preferences[key])) {
        return false
      }
    }
  }
  
  return true
}

// Trading Ideas interfaces
export interface TradingIdea {
  id: number
  created_at: string
  theme: string
  analysis: string
  tickers: string
}

// Save idea validation
export interface SaveIdeaRequest {
  idea_id: number
  notes?: string
}

export function isValidSaveIdeaRequest(body: any): body is SaveIdeaRequest {
  if (!validators.isObject(body)) return false
  
  if (!validators.isNumber(body.idea_id) || body.idea_id <= 0) {
    return false
  }
  
  if (body.notes !== undefined && !validators.isString(body.notes)) {
    return false
  }
  
  return true
}

// Watchlist validation
export interface AddToWatchlistRequest {
  ticker: string
  watchlist_name?: string
}

export function isValidWatchlistRequest(body: any): body is AddToWatchlistRequest {
  if (!validators.isObject(body)) return false
  
  if (!validators.isNonEmptyString(body.ticker)) {
    return false
  }
  
  // Validate ticker format (basic stock ticker validation)
  const tickerRegex = /^[A-Za-z]{1,5}$/
  if (!tickerRegex.test(body.ticker.trim())) {
    return false
  }
  
  if (body.watchlist_name !== undefined && !validators.isNonEmptyString(body.watchlist_name)) {
    return false
  }
  
  return true
}

// Subscribe validation
export interface SubscribeRequest {
  email: string
}

export function isValidSubscribeRequest(body: any): body is SubscribeRequest {
  if (!validators.isObject(body)) return false
  
  if (!validators.isEmail(body.email)) {
    return false
  }
  
  return true
}
