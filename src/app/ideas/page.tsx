'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { UserMenu } from '@/components/auth/UserMenu'
import { TrendingUp, Clock, Plus, Bookmark, BookmarkCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface TradingIdea {
  id: number
  created_at: string
  theme: string
  analysis: string
  tickers: string
}

function IdeasContent() {
  const { user } = useAuth()
  const [ideas, setIdeas] = useState<TradingIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedIdeas, setSavedIdeas] = useState<number[]>([])
  const [addingToWatchlist, setAddingToWatchlist] = useState<string | null>(null)
  const [savingIdea, setSavingIdea] = useState<number | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchAllIdeas = async () => {
      try {
        const response = await fetch('/api/ideas/all')
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

    fetchAllIdeas()
  }, [])

  useEffect(() => {
    const fetchSavedIdeas = async () => {
      try {
        const response = await fetch('/api/ideas/saved')
        const result = await response.json()
        
        if (response.ok && result.data) {
          const savedIdeaIds = result.data.map((interaction: { idea_id: number }) => interaction.idea_id)
          setSavedIdeas(savedIdeaIds)
        }
      } catch (err) {
        console.error('Failed to fetch saved ideas:', err)
      }
    }

    fetchSavedIdeas()
  }, [])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffHours < 1) return 'Just now'
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const addToWatchlist = async (ticker: string) => {
    setAddingToWatchlist(ticker)
    setMessage('')
    
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticker })
      })

      const result = await response.json()
      
      if (response.ok) {
        setMessage(result.message || `${ticker} added to watchlist!`)
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage(result.error || 'Failed to add to watchlist')
        setTimeout(() => setMessage(''), 5000)
      }
    } catch (err) {
      setMessage('Network error occurred')
      setTimeout(() => setMessage(''), 5000)
    } finally {
      setAddingToWatchlist(null)
    }
  }

  const toggleSaveIdea = async (ideaId: number) => {
    setSavingIdea(ideaId)
    setMessage('')
    
    const isCurrentlySaved = savedIdeas.includes(ideaId)
    
    try {
      if (isCurrentlySaved) {
        const response = await fetch(`/api/ideas/saved?idea_id=${ideaId}`, {
          method: 'DELETE'
        })

        const result = await response.json()
        
        if (response.ok) {
          setSavedIdeas(prev => prev.filter(id => id !== ideaId))
          setMessage(result.message || 'Idea removed from saved!')
          setTimeout(() => setMessage(''), 3000)
        } else {
          setMessage(result.error || 'Failed to remove saved idea')
          setTimeout(() => setMessage(''), 5000)
        }
      } else {
        const response = await fetch('/api/ideas/saved', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idea_id: ideaId })
        })

        const result = await response.json()
        
        if (response.ok) {
          setSavedIdeas(prev => [...prev, ideaId])
          setMessage(result.message || 'Idea saved!')
          setTimeout(() => setMessage(''), 3000)
        } else {
          setMessage(result.error || 'Failed to save idea')
          setTimeout(() => setMessage(''), 5000)
        }
      }
    } catch (err) {
      setMessage('Network error occurred')
      setTimeout(() => setMessage(''), 5000)
    } finally {
      setSavingIdea(null)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">All Trading Ideas</h1>
                <p className="text-gray-600">
                  Browse all AI-generated trading opportunities
                </p>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Message */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">{message}</p>
          </div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-xl p-8 border border-gray-200 max-w-md mx-auto">
              <p className="text-red-600 mb-2">Failed to load trading ideas</p>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-xl p-8 border border-gray-200 max-w-md mx-auto">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No trading ideas available</p>
              <p className="text-sm text-gray-400 mt-2">
                New ideas are generated daily. Check back soon!
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                Showing {ideas.length} trading idea{ideas.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ideas.map((idea) => (
                <div key={idea.id} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatTime(idea.created_at)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSaveIdea(idea.id)}
                        disabled={savingIdea === idea.id}
                        className={`p-2 rounded-full transition-colors ${
                          savedIdeas.includes(idea.id)
                            ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                            : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                        } disabled:opacity-50`}
                        title={savedIdeas.includes(idea.id) ? 'Remove from saved' : 'Save idea'}
                      >
                        {savingIdea === idea.id ? (
                          <div className="h-5 w-5 border border-gray-300 border-t-yellow-600 rounded-full animate-spin"></div>
                        ) : savedIdeas.includes(idea.id) ? (
                          <BookmarkCheck className="h-5 w-5" />
                        ) : (
                          <Bookmark className="h-5 w-5" />
                        )}
                      </button>
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {idea.theme}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 text-sm">
                    {idea.analysis}
                  </p>
                  
                  <div className="flex flex-wrap gap-1">
                    {idea.tickers.split(',').map((ticker, index) => {
                      const cleanTicker = ticker.trim().replace(/[\[\]"]/g, '')
                      if (!cleanTicker) return null
                      
                      return (
                        <div key={index} className="flex items-center gap-1">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md font-medium">
                            {cleanTicker}
                          </span>
                          <button
                            onClick={() => addToWatchlist(cleanTicker)}
                            disabled={addingToWatchlist === cleanTicker}
                            className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50"
                            title={`Add ${cleanTicker} to watchlist`}
                          >
                            {addingToWatchlist === cleanTicker ? (
                              <div className="h-3 w-3 border border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function IdeasPage() {
  return (
    <AuthGuard requireAuth={true}>
      <IdeasContent />
    </AuthGuard>
  )
}
