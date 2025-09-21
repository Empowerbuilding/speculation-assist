export interface Database {
    public: {
      Tables: {
        user_profiles: {
          Row: {
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
          Insert: {
            id: string
            email: string
            first_name?: string
            last_name?: string
            display_name?: string
            avatar_url?: string
            subscription_status?: 'free' | 'premium' | 'trial'
            subscription_expires_at?: string
            is_newsletter_subscribed?: boolean
            preferences?: {
              email_notifications?: boolean
              push_notifications?: boolean
              marketing_emails?: boolean
              daily_digest?: boolean
            }
          }
          Update: {
            email?: string
            first_name?: string
            last_name?: string
            display_name?: string
            avatar_url?: string
            subscription_status?: 'free' | 'premium' | 'trial'
            subscription_expires_at?: string
            is_newsletter_subscribed?: boolean
            preferences?: {
              email_notifications?: boolean
              push_notifications?: boolean
              marketing_emails?: boolean
              daily_digest?: boolean
            }
            updated_at?: string
          }
        }
        user_watchlists: {
          Row: {
            id: string
            user_id: string
            name: string
            description?: string
            tickers: string[]
            is_default: boolean
            created_at: string
            updated_at: string
          }
          Insert: {
            user_id: string
            name: string
            description?: string
            tickers?: string[]
            is_default?: boolean
          }
          Update: {
            name?: string
            description?: string
            tickers?: string[]
            is_default?: boolean
            updated_at?: string
          }
        }
        user_portfolios: {
          Row: {
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
          Insert: {
            user_id: string
            ticker: string
            shares: number
            avg_cost: number
            purchase_date?: string
            notes?: string
          }
          Update: {
            ticker?: string
            shares?: number
            avg_cost?: number
            purchase_date?: string
            notes?: string
            updated_at?: string
          }
        }
        user_idea_interactions: {
          Row: {
            id: string
            user_id: string
            idea_id: number
            interaction_type: 'viewed' | 'liked' | 'saved' | 'traded'
            notes?: string
            created_at: string
          }
          Insert: {
            user_id: string
            idea_id: number
            interaction_type: 'viewed' | 'liked' | 'saved' | 'traded'
            notes?: string
          }
          Update: {
            interaction_type?: 'viewed' | 'liked' | 'saved' | 'traded'
            notes?: string
          }
        }
        generated_ideas: {
          Row: {
            id: number
            created_at: string
            theme: string
            analysis: string
            tickers: string
          }
          Insert: {
            theme: string
            analysis: string
            tickers: string
          }
          Update: {
            theme?: string
            analysis?: string
            tickers?: string
          }
        }
        subscribers: {
          Row: {
            id: string
            email: string
            created_at: string
            is_active: boolean
          }
          Insert: {
            email: string
            is_active?: boolean
          }
          Update: {
            email?: string
            is_active?: boolean
          }
        }
      }
    }
  }