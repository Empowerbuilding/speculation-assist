// API Response Types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// Trading Ideas Types (matching actual Supabase schema)
export interface TradingIdea {
  id: number
  created_at: string
  theme: string
  analysis: string
  tickers: string
}

// Subscriber Types
export interface Subscriber {
  id: string
  email: string
  created_at: string
  is_active: boolean
}

// Request Types
export interface SubscribeRequest {
  email: string
}

// Database Table Types (for Supabase)
export interface Database {
  public: {
    Tables: {
      generated_ideas: {
        Row: TradingIdea
        Insert: Omit<TradingIdea, 'id' | 'created_at'>
        Update: Partial<Omit<TradingIdea, 'id' | 'created_at'>>
      }
      subscribers: {
        Row: Subscriber
        Insert: Omit<Subscriber, 'id' | 'created_at'>
        Update: Partial<Omit<Subscriber, 'id' | 'created_at'>>
      }
    }
  }
}
