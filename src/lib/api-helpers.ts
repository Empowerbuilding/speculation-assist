import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { User } from '@supabase/supabase-js'

// Standard API response types
export interface ApiSuccessResponse<T = unknown> {
  data: T
  message?: string
}

export interface ApiErrorResponse {
  error: string
  details?: unknown
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
  details?: unknown, 
  code?: string
): NextResponse {
  const response: ApiErrorResponse = { error }
  if (details) response.details = details
  if (code) response.code = code
  
  console.error(`API Error [${status}]:`, error, details || '')
  
  return NextResponse.json(response, { status })
}

// Authentication wrapper
export function withAuth<T extends unknown[]>(
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
  validator: (body: unknown) => body is T,
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
  isString: (value: unknown): value is string => typeof value === 'string',
  isNumber: (value: unknown): value is number => typeof value === 'number',
  isBoolean: (value: unknown): value is boolean => typeof value === 'boolean',
  isObject: (value: unknown): value is object => typeof value === 'object' && value !== null && !Array.isArray(value),
  isArray: (value: unknown): value is unknown[] => Array.isArray(value),
  isEmail: (value: unknown): value is string => 
    typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  hasKeys: <T extends string>(obj: unknown, keys: T[]): obj is Record<T, unknown> =>
    typeof obj === 'object' && obj !== null && keys.every(key => key in obj),
  isNonEmptyString: (value: unknown): value is string => 
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

export function isValidProfileUpdate(body: unknown): body is ProfileUpdateRequest {
  if (!validators.isObject(body)) return false
  
  const validFields = ['first_name', 'last_name', 'display_name', 'avatar_url', 'preferences']
  // Cast to Record<string, unknown> after type guard
  const bodyObj = body as Record<string, unknown>
  const bodyKeys = Object.keys(bodyObj)
  
  // Check that all keys are valid
  if (!bodyKeys.every(key => validFields.includes(key))) {
    return false
  }
  
  // Validate string fields if present
  const stringFields = ['first_name', 'last_name', 'display_name', 'avatar_url']
  for (const field of stringFields) {
    if (bodyObj[field] !== undefined && !validators.isString(bodyObj[field])) {
      return false
    }
  }
  
  // Validate preferences if present
  if (bodyObj.preferences !== undefined) {
    if (!validators.isObject(bodyObj.preferences)) return false
    
    const preferences = bodyObj.preferences as Record<string, unknown>
    const prefKeys = Object.keys(preferences)
    const validPrefKeys = ['email_notifications', 'push_notifications', 'marketing_emails', 'daily_digest']
    
    if (!prefKeys.every(key => validPrefKeys.includes(key))) {
      return false
    }
    
    for (const key of prefKeys) {
      if (!validators.isBoolean(preferences[key])) {
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

export function isValidSaveIdeaRequest(body: unknown): body is SaveIdeaRequest {
  if (!validators.isObject(body)) return false
  
  const bodyObj = body as Record<string, unknown>
  
  if (!validators.isNumber(bodyObj.idea_id) || bodyObj.idea_id <= 0) {
    return false
  }
  
  if (bodyObj.notes !== undefined && !validators.isString(bodyObj.notes)) {
    return false
  }
  
  return true
}

// Watchlist validation
export interface AddToWatchlistRequest {
  ticker: string
  watchlist_name?: string
}

export function isValidWatchlistRequest(body: unknown): body is AddToWatchlistRequest {
  if (!validators.isObject(body)) return false
  
  const bodyObj = body as Record<string, unknown>
  
  if (!validators.isNonEmptyString(bodyObj.ticker)) {
    return false
  }
  
  // Validate ticker format (basic stock ticker validation)
  const tickerRegex = /^[A-Za-z]{1,5}$/
  if (!tickerRegex.test((bodyObj.ticker as string).trim())) {
    return false
  }
  
  if (bodyObj.watchlist_name !== undefined && !validators.isNonEmptyString(bodyObj.watchlist_name)) {
    return false
  }
  
  return true
}

// Subscribe validation
export interface SubscribeRequest {
  email: string
}

export function isValidSubscribeRequest(body: unknown): body is SubscribeRequest {
  if (!validators.isObject(body)) return false
  
  const bodyObj = body as Record<string, unknown>
  
  if (!validators.isEmail(bodyObj.email)) {
    return false
  }
  
  return true
}
