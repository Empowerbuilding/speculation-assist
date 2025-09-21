'use client'

import { useAuth } from '@/contexts/AuthContext'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { UserMenu } from '@/components/auth/UserMenu'
import { TrendingUp, Users, Eye, Star, Clock, ArrowRight, Plus, X, ChevronDown, ChevronUp, Bookmark, BookmarkCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface TradingIdea {
  id: number
  created_at: string
  theme: string
  analysis: string
  tickers: string
}

function DashboardContent() {
  const { user, profile, loading } = useAuth()
  const [ideas, setIdeas] = useState<TradingIdea[]>([])
  const [ideasLoading, setIdeasLoading] = useState(true)
  const [ideasError, setIdeasError] = useState('')
  const [expandedIdea, setExpandedIdea] = useState<number | null>(null)
  const [addingToWatchlist, setAddingToWatchlist] = useState<string | null>(null)
  const [watchlistMessage, setWatchlistMessage] = useState('')
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [watchlistLoading, setWatchlistLoading] = useState(true)
  const [savedIdeas, setSavedIdeas] = useState<number[]>([])
  const [savingIdea, setSavingIdea] = useState<number | null>(null)
  const [savedIdeasCount, setSavedIdeasCount] = useState(0)

  console.log('Dashboard - User:', user?.id, 'Profile:', profile?.id, 'Loading:', loading)

  useEffect(() => {
    const fetchIdeas = async () => {
      try {
        const response = await fetch('/api/ideas')
        const result = await response.json()
        
        if (response.ok) {
          setIdeas(result.data || [])
        } else {
          setIdeasError(result.error || 'Failed to fetch ideas')
        }
      } catch (err) {
        setIdeasError('Network error occurred')
      } finally {
        setIdeasLoading(false)
      }
    }

    fetchIdeas()
  }, [])

  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const response = await fetch('/api/watchlist')
        const result = await response.json()
        
        if (response.ok && result.data && result.data.length > 0) {
          // Get all tickers from all watchlists
          const allTickers = result.data.reduce((acc: string[], watchlist: any) => {
            return [...acc, ...watchlist.tickers]
          }, [])
          setWatchlist([...new Set(allTickers)]) // Remove duplicates
        }
      } catch (err) {
        console.error('Failed to fetch watchlist:', err)
      } finally {
        setWatchlistLoading(false)
      }
    }

    fetchWatchlist()
  }, [])

  useEffect(() => {
    const fetchSavedIdeas = async () => {
      try {
        const response = await fetch('/api/ideas/saved')
        const result = await response.json()
        
        if (response.ok && result.data) {
          const savedIdeaIds = result.data.map((interaction: any) => interaction.idea_id)
          setSavedIdeas(savedIdeaIds)
          setSavedIdeasCount(result.data.length)
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
    
    if (diffHours < 1) return 'Just now'
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    return date.toLocaleDateString()
  }

  const addToWatchlist = async (ticker: string) => {
    setAddingToWatchlist(ticker)
    setWatchlistMessage('')
    
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
        setWatchlistMessage(result.message || `${ticker} added to watchlist!`)
        // Refresh watchlist to show new ticker
        setWatchlist(prev => [...new Set([...prev, ticker])])
        setTimeout(() => setWatchlistMessage(''), 3000) // Clear message after 3 seconds
      } else {
        setWatchlistMessage(result.error || 'Failed to add to watchlist')
        setTimeout(() => setWatchlistMessage(''), 5000)
      }
    } catch (err) {
      setWatchlistMessage('Network error occurred')
      setTimeout(() => setWatchlistMessage(''), 5000)
    } finally {
      setAddingToWatchlist(null)
    }
  }

  const toggleExpanded = (ideaId: number) => {
    setExpandedIdea(expandedIdea === ideaId ? null : ideaId)
  }

  const toggleSaveIdea = async (ideaId: number) => {
    setSavingIdea(ideaId)
    setWatchlistMessage('')
    
    const isCurrentlySaved = savedIdeas.includes(ideaId)
    
    try {
      if (isCurrentlySaved) {
        // Unsave the idea
        const response = await fetch(`/api/ideas/saved?idea_id=${ideaId}`, {
          method: 'DELETE'
        })

        const result = await response.json()
        
        if (response.ok) {
          setSavedIdeas(prev => prev.filter(id => id !== ideaId))
          setSavedIdeasCount(prev => prev - 1)
          setWatchlistMessage(result.message || 'Idea removed from saved!')
          setTimeout(() => setWatchlistMessage(''), 3000)
        } else {
          setWatchlistMessage(result.error || 'Failed to remove saved idea')
          setTimeout(() => setWatchlistMessage(''), 5000)
        }
      } else {
        // Save the idea
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
          setSavedIdeasCount(prev => prev + 1)
          setWatchlistMessage(result.message || 'Idea saved!')
          setTimeout(() => setWatchlistMessage(''), 3000)
        } else {
          setWatchlistMessage(result.error || 'Failed to save idea')
          setTimeout(() => setWatchlistMessage(''), 5000)
        }
      }
    } catch (err) {
      setWatchlistMessage('Network error occurred')
      setTimeout(() => setWatchlistMessage(''), 5000)
    } finally {
      setSavingIdea(null)
    }
  }

  // Show loading while user data is being fetched
  if (!user) {
    console.log('Dashboard - No user, returning null')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Welcome back, {profile?.display_name || profile?.first_name || user.user_metadata?.first_name || user.email}!
              </p>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ideas Viewed</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ideas Saved</p>
                <p className="text-2xl font-bold text-gray-900">{savedIdeasCount}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Watchlist Items</p>
                <p className="text-2xl font-bold text-gray-900">
                  {watchlistLoading ? '-' : watchlist.length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Days Active</p>
                <p className="text-2xl font-bold text-gray-900">1</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Watchlist Message */}
        {watchlistMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">{watchlistMessage}</p>
          </div>
        )}

        {/* Today's Ideas Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Today's Ideas</h2>
            <Link 
              href="/ideas"
              className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center transition-colors"
            >
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          {ideasLoading ? (
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
          ) : ideasError ? (
            <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
              <p className="text-red-600 mb-2">Failed to load trading ideas</p>
              <p className="text-gray-500 text-sm">{ideasError}</p>
            </div>
          ) : ideas.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No trading ideas available</p>
              <p className="text-sm text-gray-400 mt-2">
                New ideas are generated daily. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {ideas.map((idea) => {
                const isExpanded = expandedIdea === idea.id
                return (
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
                    
                    <p className={`text-gray-600 mb-4 text-sm ${!isExpanded ? 'line-clamp-3' : ''}`}>
                      {idea.analysis}
                    </p>

                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => toggleExpanded(idea.id)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-flex items-center"
                    >
                      {isExpanded ? (
                        <>
                          Show Less
                          <ChevronUp className="ml-1 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Read More
                          <ChevronDown className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </button>
                    
                    <div className="flex flex-wrap gap-1">
                      {idea.tickers.split(',').map((ticker, index) => {
                        const cleanTicker = ticker.trim().replace(/[\[\]"]/g, '') // Remove all [ ] and " characters
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
                )
              })}
            </div>
          )}
        </div>

        {/* My Watchlist Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">My Watchlist</h2>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            {watchlistLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 border border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-500">Loading watchlist...</span>
              </div>
            ) : watchlist.length === 0 ? (
              <div className="text-center py-8">
                <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No tickers in your watchlist</p>
                <p className="text-sm text-gray-400 mt-2">
                  Click the + button next to any ticker in the trading ideas above to add them to your watchlist!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  {watchlist.length} ticker{watchlist.length !== 1 ? 's' : ''} in your watchlist
                </p>
                <div className="flex flex-wrap gap-2">
                  {watchlist.map((ticker, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="font-medium text-blue-900">{ticker}</span>
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/watchlist?ticker=${ticker}&watchlist_name=Default Watchlist`, {
                              method: 'DELETE'
                            })
                            if (response.ok) {
                              setWatchlist(prev => prev.filter(t => t !== ticker))
                              setWatchlistMessage(`${ticker} removed from watchlist!`)
                              setTimeout(() => setWatchlistMessage(''), 3000)
                            }
                          } catch (err) {
                            console.error('Failed to remove ticker:', err)
                          }
                        }}
                        className="text-blue-600 hover:text-red-600 transition-colors"
                        title={`Remove ${ticker} from watchlist`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent activity</p>
              <p className="text-sm text-gray-400 mt-2">
                Start by viewing some trading ideas!
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
                <div className="font-medium text-gray-900">Update Preferences</div>
                <div className="text-sm text-gray-500">Customize your notification settings</div>
              </button>
              <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
                <div className="font-medium text-gray-900">View Portfolio</div>
                <div className="text-sm text-gray-500">Track your investments and performance</div>
              </button>
              <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
                <div className="font-medium text-gray-900">Export Watchlist</div>
                <div className="text-sm text-gray-500">Download your watchlist as CSV</div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function Dashboard() {
  return (
    <AuthGuard requireAuth={true}>
      <DashboardContent />
    </AuthGuard>
  )
}