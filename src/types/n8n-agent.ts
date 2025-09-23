export interface N8NAgentRequest {
  message: string
  context: {
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
}

export interface N8NAgentResponse {
  response: string
  confidence: number
  sources?: string[]
  timestamp: string
}
