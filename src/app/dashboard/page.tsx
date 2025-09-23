'use client'

import { useAuth } from '@/contexts/AuthContext'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { UserMenu } from '@/components/auth/UserMenu'
import Logo from '@/components/Logo'
import { 
  LoadingSpinner, 
  NetworkStatus,
  useLoadingStates
} from '@/components/ui/LoadingStates'
import { 
  TrendingUp, 
  Eye, 
  Star, 
  Clock, 
  X, 
  ChevronDown, 
  Bookmark, 
  BookmarkCheck,
  Send,
  MessageCircle,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface TradingIdea {
  id: number
  created_at: string
  theme: string
  analysis: string
  tickers: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  typing?: boolean
}

// Chat state management hook
function useChatState() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [input, setInput] = useState('')
  const [selectedIdea, setSelectedIdea] = useState<TradingIdea | null>(null)

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chat-messages')
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages)
        const messagesWithDates = parsed.map((msg: { id: string; role: string; content: string; timestamp: string; typing?: boolean }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        setMessages(messagesWithDates)
      } catch (error) {
        console.error('Failed to load saved messages:', error)
      }
    }
  }, [])

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chat-messages', JSON.stringify(messages))
    }
  }, [messages])

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage.id
  }

  const updateMessage = (id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, ...updates } : msg))
  }

  const sendMessage = async (content: string, watchlistData: string[] = []) => {
    if (!content.trim()) return

    // Add user message
    addMessage({ role: 'user', content: content.trim() })
    setInput('')

    // Show typing indicator
    setIsTyping(true)
    const typingId = addMessage({ role: 'assistant', content: '', typing: true })

    try {
      // Prepare request body with selected idea context for N8N agent
      const requestBody = {
        messages: [...messages, { role: 'user' as const, content: content.trim() }],
        tradingContext: {
          idea: selectedIdea ? {
            id: selectedIdea.id,
            theme: selectedIdea.theme,
            analysis: selectedIdea.analysis,
            tickers: selectedIdea.tickers
          } : undefined,
          watchlist: watchlistData.length > 0 ? watchlistData : undefined,
        }
      }

      // Call the N8N Agent API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()

      if (response.ok) {
        // Handle N8N agent response format
        let agentResponse = '';
        if (result.data?.message?.content) {
          // Legacy OpenAI format support
          agentResponse = result.data.message.content;
        } else if (result.data?.response) {
          // N8N structured response
          agentResponse = result.data.response;
        } else if (typeof result.data === 'string') {
          // N8N plain text response
          agentResponse = result.data;
        } else if (result.response) {
          // Direct response field
          agentResponse = result.response;
        } else {
          throw new Error('Unexpected response format from agent');
        }

        setIsTyping(false)
        updateMessage(typingId, {
          content: agentResponse,
          typing: false
        })
      } else {
        // Handle N8N agent errors gracefully
        setIsTyping(false)
        let errorMessage = result.error || 'I&apos;m sorry, I&apos;m having trouble connecting to my research service right now.'
        
        // Handle specific N8N webhook errors
        if (response.status === 504 || response.status === 408) {
          errorMessage = 'The request timed out while processing your query. Please try again with a simpler question.'
        } else if (response.status === 503) {
          errorMessage = 'The research service is temporarily unavailable. Please try again in a moment.'
        } else if (result.error?.includes('webhook') || result.error?.includes('N8N')) {
          errorMessage = 'There was an issue with the research service. Please try again.'
        }
        
        // Add trading idea context if available
        if (selectedIdea) {
          errorMessage += ` However, I can tell you that the trading idea &quot;${selectedIdea.theme}&quot; focuses on ${selectedIdea.tickers.split(',').slice(0, 3).join(', ')}.`
        } else {
          errorMessage += ' Please try again later.'
        }
        
        updateMessage(typingId, {
          content: errorMessage,
          typing: false
        })
      }
    } catch (error) {
      console.error('Failed to send message to N8N agent:', error)
      // Fallback response for network/connection issues
      setIsTyping(false)
      let fallbackMessage = 'I&apos;m experiencing connection issues right now.'
      
      // Check for specific network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        fallbackMessage = 'Unable to connect to the research service. Please check your internet connection and try again.'
      } else if (error instanceof Error && error.message.includes('timeout')) {
        fallbackMessage = 'The request timed out. Please try again with a simpler question.'
      }
      
      // Add trading idea context if available
      if (selectedIdea) {
        fallbackMessage += ` In the meantime, you can review the &quot;${selectedIdea.theme}&quot; trading idea which involves ${selectedIdea.tickers.split(',').slice(0, 3).join(', ')}.`
      } else {
        fallbackMessage += ' Please try again in a moment.'
      }
      
      updateMessage(typingId, {
        content: fallbackMessage,
        typing: false
      })
    }
  }

  const clearMessages = () => {
    setMessages([])
    localStorage.removeItem('chat-messages')
  }

  const selectIdea = (idea: TradingIdea) => {
    setSelectedIdea(idea)
    // Clear chat history when selecting a new idea
    clearMessages()
    // Add a welcome message for the selected idea
    setTimeout(() => {
      addMessage({
        role: 'assistant',
        content: `Great! I&apos;m now focused on the &quot;${idea.theme}&quot; trading idea. This idea involves ${idea.tickers.split(',').slice(0, 3).map(t => t.trim().replace(/[\[\]&quot;]/g, '')).join(', ')}. 

What would you like to know about this trading opportunity? I can help you understand the analysis, discuss the risks, or explore how it might fit into your portfolio.`
      })
    }, 100)
  }

  const clearSelectedIdea = () => {
    setSelectedIdea(null)
    clearMessages()
    // Add a general welcome message
    setTimeout(() => {
      addMessage({
        role: 'assistant',
        content: `I&apos;m back to general trading assistance mode! Feel free to ask me about market trends, your watchlist, or select a specific trading idea to discuss in detail.`
      })
    }, 100)
  }

  return {
    messages,
    isTyping,
    input,
    setInput,
    sendMessage,
    clearMessages,
    selectedIdea,
    selectIdea,
    clearSelectedIdea
  }
}


function DashboardContent() {
  const { user, profile, loading } = useAuth()
  const { setLoading, isLoading } = useLoadingStates()
  const [ideas, setIdeas] = useState<TradingIdea[]>([])
  const [ideasError, setIdeasError] = useState('')
  const [expandedIdea, setExpandedIdea] = useState<number | null>(null)
  const [, setAddingToWatchlist] = useState<string | null>(null)
  const [watchlistMessage, setWatchlistMessage] = useState('')
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [watchlistError, setWatchlistError] = useState('')
  const [savedIdeas, setSavedIdeas] = useState<number[]>([])
  const [savingIdea, setSavingIdea] = useState<number | null>(null)
  const [savedIdeasCount, setSavedIdeasCount] = useState(0)
  
  // Chat and sidebar state
  const chat = useChatState()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activePanel, setActivePanel] = useState<'stats' | 'ideas' | 'watchlist' | 'activity' | null>('stats')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages])

  console.log('Dashboard - User:', user?.id, 'Profile:', profile?.id, 'Loading:', loading)

  const fetchIdeas = async () => {
    setLoading('ideas', true)
    setIdeasError('')
    try {
      const response = await fetch('/api/ideas')
      const result = await response.json()
      
      if (response.ok) {
        setIdeas(result.data || [])
      } else {
        setIdeasError(result.error || 'Failed to fetch ideas')
      }
    } catch {
      setIdeasError('Network error occurred')
    } finally {
      setLoading('ideas', false)
    }
  }

  useEffect(() => {
    fetchIdeas()
  }, [])

  const fetchWatchlist = async () => {
    setLoading('watchlist', true)
    setWatchlistError('')
    try {
      const response = await fetch('/api/watchlist')
      const result = await response.json()
      
      if (response.ok && result.data && result.data.length > 0) {
        // Get all tickers from all watchlists
        const allTickers = result.data.reduce((acc: string[], watchlist: { tickers: string[] }) => {
          return [...acc, ...(watchlist.tickers as string[])]
        }, [] as string[])
        setWatchlist(Array.from(new Set(allTickers))) // Remove duplicates
      } else if (!response.ok) {
        setWatchlistError(result.error || 'Failed to fetch watchlist')
      }
    } catch {
      setWatchlistError('Network error occurred')
    } finally {
      setLoading('watchlist', false)
    }
  }

  useEffect(() => {
    fetchWatchlist()
  }, [])

  const fetchSavedIdeas = async () => {
    setLoading('savedIdeas', true)
    try {
      const response = await fetch('/api/ideas/saved')
      const result = await response.json()
      
      if (response.ok && result.data) {
        const savedIdeaIds = result.data.map((interaction: { idea_id: number }) => interaction.idea_id)
        setSavedIdeas(savedIdeaIds)
        setSavedIdeasCount(result.data.length)
      }
    } catch (err) {
      console.error('Failed to fetch saved ideas:', err)
    } finally {
      setLoading('savedIdeas', false)
    }
  }

  useEffect(() => {
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

  const formatChatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
    } catch {
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
    } catch {
      setWatchlistMessage('Network error occurred')
      setTimeout(() => setWatchlistMessage(''), 5000)
    } finally {
      setSavingIdea(null)
    }
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (chat.input.trim()) {
      chat.sendMessage(chat.input.trim(), watchlist)
    }
  }

  const togglePanel = (panel: typeof activePanel) => {
    setActivePanel(activePanel === panel ? null : panel)
  }

  // Show loading while user data is being fetched
  if (!user) {
    console.log('Dashboard - No user, returning null')
    return null
  }

  return (
    <div className="h-screen bg-white flex">
      {/* Network Status */}
      <NetworkStatus />
      
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden bg-white border-r border-gray-200 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <h2 className="font-semibold text-gray-900">SpeculationAssist</h2>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors lg:hidden"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Stats Panel */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => togglePanel('stats')}
              className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Overview</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${activePanel === 'stats' ? 'rotate-180' : ''}`} />
            </button>
            
            {activePanel === 'stats' && (
              <div className="px-4 pb-4 space-y-3">
                {isLoading('savedIdeas') || isLoading('watchlist') ? (
                  <>
                    <div className="animate-pulse bg-gray-100 rounded-lg p-3 h-16"></div>
                    <div className="animate-pulse bg-gray-100 rounded-lg p-3 h-16"></div>
                    <div className="animate-pulse bg-gray-100 rounded-lg p-3 h-16"></div>
                    <div className="animate-pulse bg-gray-100 rounded-lg p-3 h-16"></div>
                  </>
                ) : (
                  <>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-blue-600">Ideas Viewed</p>
                          <p className="text-lg font-bold text-blue-900">0</p>
                        </div>
                        <Eye className="h-5 w-5 text-blue-500" />
                      </div>
                    </div>

                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-yellow-600">Ideas Saved</p>
                          <p className="text-lg font-bold text-yellow-900">{savedIdeasCount}</p>
                        </div>
                        <Star className="h-5 w-5 text-yellow-500" />
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-green-600">Watchlist</p>
                          <p className="text-lg font-bold text-green-900">{watchlist.length}</p>
                        </div>
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-purple-600">Days Active</p>
                          <p className="text-lg font-bold text-purple-900">1</p>
                        </div>
                        <Clock className="h-5 w-5 text-purple-500" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Ideas Panel */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => togglePanel('ideas')}
              className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Today&apos;s Ideas</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${activePanel === 'ideas' ? 'rotate-180' : ''}`} />
            </button>
            
            {activePanel === 'ideas' && (
              <div className="px-4 pb-4">
                {isLoading('ideas') ? (
                  <div className="space-y-3">
                    <div className="animate-pulse bg-gray-100 rounded-lg p-3 h-24"></div>
                    <div className="animate-pulse bg-gray-100 rounded-lg p-3 h-24"></div>
                  </div>
                ) : ideasError ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-red-600 mb-2">{ideasError}</p>
                    <button
                      onClick={fetchIdeas}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Retry
                    </button>
                  </div>
                ) : ideas.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No ideas available</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {ideas.slice(0, 3).map((idea) => {
                      const isSelected = chat.selectedIdea?.id === idea.id
                      return (
                        <div 
                          key={idea.id} 
                          className={`rounded-lg p-3 border transition-all ${
                            isSelected 
                              ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' 
                              : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className={`text-sm font-medium line-clamp-2 ${
                              isSelected ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {isSelected && '🎯 '}{idea.theme}
                            </h4>
                            <button
                              onClick={() => toggleSaveIdea(idea.id)}
                              disabled={savingIdea === idea.id}
                              className={`ml-2 p-1 rounded transition-colors ${
                                savedIdeas.includes(idea.id)
                                  ? 'text-yellow-600 bg-yellow-50'
                                  : 'text-gray-400 hover:text-yellow-600'
                              } disabled:opacity-50`}
                            >
                              {savingIdea === idea.id ? (
                                <div className="h-3 w-3 border border-gray-300 border-t-yellow-600 rounded-full animate-spin"></div>
                              ) : savedIdeas.includes(idea.id) ? (
                                <BookmarkCheck className="h-3 w-3" />
                              ) : (
                                <Bookmark className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{idea.analysis}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {idea.tickers.split(',').slice(0, 3).map((ticker, index) => {
                              const cleanTicker = ticker.trim().replace(/[\[\]"]/g, '')
                              if (!cleanTicker) return null
                              
                              return (
                                <span key={index} className={`px-1.5 py-0.5 text-xs rounded font-medium ${
                                  isSelected 
                                    ? 'bg-blue-200 text-blue-900' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {cleanTicker}
                                </span>
                              )
                            })}
                          </div>
                          <button
                            onClick={() => chat.selectIdea(idea)}
                          className={`w-full text-xs font-medium py-1.5 px-2 rounded transition-colors ${
                            isSelected
                              ? 'bg-gradient-to-r from-green-600 to-red-600 text-white hover:from-green-700 hover:to-red-700'
                              : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200'
                          }`}
                          >
                            {isSelected ? '✓ Discussing with AI' : '💬 Discuss with AI'}
                          </button>
                        </div>
                      )
                    })}
                    <Link
                      href="/ideas"
                      className="block text-center py-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View All Ideas →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Watchlist Panel */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => togglePanel('watchlist')}
              className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Watchlist</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${activePanel === 'watchlist' ? 'rotate-180' : ''}`} />
            </button>
            
            {activePanel === 'watchlist' && (
              <div className="px-4 pb-4">
                {isLoading('watchlist') ? (
                  <div className="text-center py-4">
                    <LoadingSpinner message="Loading..." />
                  </div>
                ) : watchlistError ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-red-600 mb-2">{watchlistError}</p>
                    <button
                      onClick={fetchWatchlist}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Retry
                    </button>
                  </div>
                ) : watchlist.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No tickers in watchlist</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    <p className="text-xs text-gray-500 mb-2">
                      {watchlist.length} ticker{watchlist.length !== 1 ? 's' : ''}
                    </p>
                    {watchlist.map((ticker, index) => (
                      <div key={index} className="flex items-center justify-between bg-blue-50 rounded-lg p-2 border border-blue-100">
                        <span className="text-sm font-medium text-blue-900">{ticker}</span>
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
                          className="text-blue-600 hover:text-red-600 transition-colors p-1"
                          title={`Remove ${ticker}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity Panel */}
          <div>
            <button
              onClick={() => togglePanel('activity')}
              className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Activity</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${activePanel === 'activity' ? 'rotate-180' : ''}`} />
            </button>
            
            {activePanel === 'activity' && (
              <div className="px-4 pb-4">
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No recent activity</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Chat Header */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-medium text-gray-900">
                    Welcome back, {profile?.display_name || profile?.first_name || user.user_metadata?.first_name || user.email}!
                  </p>
                  {chat.selectedIdea && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">•</span>
                      <span className="text-blue-600 font-medium text-sm">
                        🎯 {chat.selectedIdea.theme}
                      </span>
                    </div>
                  )}
                </div>
                {chat.selectedIdea && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-blue-600">
                      {chat.selectedIdea.tickers.split(',').slice(0, 3).map(t => t.trim().replace(/[\[\]"]/g, '')).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {chat.selectedIdea && (
                <button
                  onClick={chat.clearSelectedIdea}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
                >
                  Clear Selection
                </button>
              )}
              <button
                onClick={chat.clearMessages}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                Clear Chat
              </button>
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30 min-h-0">
          {chat.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                {chat.selectedIdea ? (
                  <>
                    <div className="bg-blue-50 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Discussing: {chat.selectedIdea.theme}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      I&apos;m focused on this trading idea involving {chat.selectedIdea.tickers.split(',').slice(0, 3).map(t => t.trim().replace(/[\[\]&quot;]/g, '')).join(', ')}.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {chat.selectedIdea.analysis}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm text-gray-500">
                      <p>Ask me about:</p>
                      <div className="space-y-1">
                        <button
                          onClick={() => chat.sendMessage("What are the key risks with this trading idea?", watchlist)}
                          className="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          &quot;What are the key risks with this idea?&quot;
                        </button>
                        <button
                          onClick={() => chat.sendMessage("How does this fit into a diversified portfolio?", watchlist)}
                          className="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          &quot;How does this fit into my portfolio?&quot;
                        </button>
                        <button
                          onClick={() => chat.sendMessage("What's the best entry strategy for this idea?", watchlist)}
                          className="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          &quot;What&apos;s the best entry strategy?&quot;
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
                    <p className="text-gray-600 mb-6">
                      Ask me about trading ideas, market analysis, or managing your watchlist. Select a trading idea from the sidebar for focused discussion!
                    </p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <p>Try asking:</p>
                      <div className="space-y-1">
                        <button
                          onClick={() => chat.sendMessage("What are some good trading ideas for today?", watchlist)}
                          className="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          &quot;What are some good trading ideas for today?&quot;
                        </button>
                        <button
                          onClick={() => chat.sendMessage("How is the market performing?", watchlist)}
                          className="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          &quot;How is the market performing?&quot;
                        </button>
                        <button
                          onClick={() => chat.sendMessage("Help me analyze my watchlist", watchlist)}
                          className="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          &quot;Help me analyze my watchlist&quot;
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              {chat.messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-2xl px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}>
                    {message.typing ? (
                      <div className="flex items-center space-x-1">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm text-gray-500 ml-2">AI is typing...</span>
                      </div>
                    ) : (
                      <>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <div className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatChatTime(message.timestamp)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Chat Input */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
          {watchlistMessage && (
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">{watchlistMessage}</p>
            </div>
          )}
          
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={chat.input}
              onChange={(e) => chat.setInput(e.target.value)}
              placeholder="Ask about trading ideas, market analysis, or your watchlist..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={chat.isTyping}
            />
            <button
              type="submit"
              disabled={!chat.input.trim() || chat.isTyping}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-red-600 hover:from-green-700 hover:to-red-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
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