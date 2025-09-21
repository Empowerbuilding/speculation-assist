'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Clock, ArrowRight } from 'lucide-react'

interface TradingIdea {
  id: number
  created_at: string
  theme: string
  analysis: string
  tickers: string
}

export default function TradingIdeasPreview() {
  const [ideas, setIdeas] = useState<TradingIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchIdeas = async () => {
      try {
        const response = await fetch('/api/ideas')
        const result = await response.json()
        
        if (response.ok) {
          setIdeas(result.data || [])
        } else {
          setError(result.error || 'Failed to fetch ideas')
        }
      } catch (err) {
        setError('Network error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchIdeas()
  }, [])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Recent Trading Ideas
            </h2>
            <p className="text-xl text-gray-600">AI-powered opportunities updated daily</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Recent Trading Ideas
          </h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Recent Trading Ideas
          </h2>
          <p className="text-xl text-gray-600">AI-powered opportunities updated daily</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {ideas.map((idea) => (
            <div key={idea.id} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatTime(idea.created_at)}
                </div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {idea.theme}
              </h3>
              
              <p className="text-gray-600 mb-4 line-clamp-3">
                {idea.analysis}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {idea.tickers.split(',').slice(0, 3).map((ticker, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md font-medium"
                    >
                      {ticker.trim()}
                    </span>
                  ))}
                  {idea.tickers.split(',').length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                      +{idea.tickers.split(',').length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <button className="bg-gradient-to-r from-green-600 to-red-600 hover:from-green-700 hover:to-red-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 inline-flex items-center">
            View All Ideas
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}