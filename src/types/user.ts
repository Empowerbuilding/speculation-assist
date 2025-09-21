export interface UserProfile {
    id: string
    email: string
    first_name?: string
    last_name?: string
    display_name?: string
    avatar_url?: string
    subscription_status: 'free' | 'premium' | 'trial'
    subscription_expires_at?: string
    is_newsletter_subscribed: boolean
    preferences: {
      email_notifications: boolean
      push_notifications: boolean
      marketing_emails: boolean
      daily_digest: boolean
    }
    created_at: string
    updated_at: string
  }
  
  export interface UserWatchlist {
    id: string
    user_id: string
    name: string
    description?: string
    tickers: string[]
    is_default: boolean
    created_at: string
    updated_at: string
  }
  
  export interface UserPortfolio {
    id: string
    user_id: string
    ticker: string
    shares: number
    avg_cost: number
    purchase_date?: string
    notes?: string
    created_at: string
    updated_at: string
  }
  
  export interface UserIdeaInteraction {
    id: string
    user_id: string
    idea_id: number
    interaction_type: 'viewed' | 'liked' | 'saved' | 'traded'
    notes?: string
    created_at: string
  }