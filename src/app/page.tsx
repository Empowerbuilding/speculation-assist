'use client'

import { useState, useEffect } from 'react'
import { Brain, Mail, ArrowRight, BarChart3, Clock } from "lucide-react"
import Logo from '@/components/Logo'

interface TradingIdea {
  id: number
  created_at: string
  theme: string
  analysis: string
  tickers: string
}

export default function Home() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [tradingIdeas, setTradingIdeas] = useState<TradingIdea[]>([])

  useEffect(() => {
    // Fetch latest trading ideas
    const fetchTradingIdeas = async () => {
      try {
        const response = await fetch('/api/ideas')
        if (response.ok) {
          const result = await response.json()
          setTradingIdeas(result.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch trading ideas:', error)
      }
    }

    fetchTradingIdeas()
  }, [])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(result.message || 'Successfully subscribed!')
        setEmail('')
      } else {
        setMessage(result.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setMessage('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Logo size="md" showPulse={true} />
              <h1 className="text-2xl font-bold text-gray-900">SpeculationAssist</h1>
            </div>
            <button className="bg-gradient-to-r from-green-600 to-red-600 hover:from-green-700 hover:to-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-20">
          <div className="inline-flex items-center bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 mb-8">
            <Brain className="h-4 w-4 text-green-400 mr-2" />
            <span className="text-green-600 text-sm font-medium">Powered by Advanced AI</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Daily Trading Ideas
            <br />
            <span className="bg-gradient-to-r from-green-400 to-red-400 bg-clip-text text-transparent">
              Powered by AI
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Get 3 AI-analyzed trading opportunities delivered every morning. 
            Our algorithms scan thousands of stocks to find the best setups.
          </p>

          {/* Email Signup Form */}
          <div className="max-w-md mx-auto mb-8">
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address" 
                  required
                  className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                />
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-green-600 to-red-600 hover:from-green-700 hover:to-red-700 disabled:opacity-50 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center"
              >
                {isLoading ? 'Subscribing...' : (
                  <>
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </form>
            
            {message && (
              <p className={`mt-4 text-sm ${message.includes('Success') || message.includes('subscribed') || message.includes('reactivated') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
          </div>

          <p className="text-gray-500 text-sm">
            Join 10,000+ traders • No spam, unsubscribe anytime
          </p>
        </div>

        {/* How It Works Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <a href="https://ovwmwqiklprhdwuiypax.supabase.co/storage/v1/object/public/website/Icons/lab-front-premium.png" target="_blank" rel="noopener noreferrer" className="block">
                  <div className="bg-gradient-to-br from-green-50 to-gray-50 border border-green-200 rounded-2xl p-8 mb-6 hover:shadow-md transition-shadow cursor-pointer">
                    <img src="https://ovwmwqiklprhdwuiypax.supabase.co/storage/v1/object/public/website/Icons/lab-front-premium.png" alt="AI Analysis" className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Analysis</h3>
                  <p className="text-gray-600">
                    Our AI scans market data, news, and technical indicators to identify high-probability trading setups.
                  </p>
                </div>
              </a>
            </div>
            
            <div className="text-center">
              <a href="https://ovwmwqiklprhdwuiypax.supabase.co/storage/v1/object/public/website/Icons/bulb-front-color.png" target="_blank" rel="noopener noreferrer" className="block">
                  <div className="bg-gradient-to-br from-red-50 to-gray-50 border border-red-200 rounded-2xl p-8 mb-6 hover:shadow-md transition-shadow cursor-pointer">
                    <img src="https://ovwmwqiklprhdwuiypax.supabase.co/storage/v1/object/public/website/Icons/bulb-front-color.png" alt="3 Daily Ideas" className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">3 Daily Ideas</h3>
                  <p className="text-gray-600">
                    Receive exactly 3 curated trading opportunities each morning with entry points and risk management.
                  </p>
                </div>
              </a>
            </div>
            
            <div className="text-center">
              <a href="https://ovwmwqiklprhdwuiypax.supabase.co/storage/v1/object/public/website/Icons/mail-front-color.png" target="_blank" rel="noopener noreferrer" className="block">
                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-2xl p-8 mb-6 hover:shadow-md transition-shadow cursor-pointer">
                    <img src="https://ovwmwqiklprhdwuiypax.supabase.co/storage/v1/object/public/website/Icons/mail-front-color.png" alt="Inbox Delivery" className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Inbox Delivery</h3>
                  <p className="text-gray-600">
                    Get your daily trading ideas delivered straight to your inbox before market open.
                  </p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Latest Market Analysis Section */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Latest Market Analysis</h2>
            <div className="flex items-center text-gray-500 text-sm">
              <Clock className="h-4 w-4 mr-1" />
              Updated daily at 6:00 AM EST
            </div>
          </div>
          
          {tradingIdeas.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tradingIdeas.slice(0, 3).map((idea) => (
                <div 
                  key={idea.id} 
                  className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-green-600" />
                      <span className="font-bold text-gray-900 text-lg">{idea.theme}</span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                      ANALYSIS
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {idea.tickers.split(',').map((ticker, index) => (
                        <span 
                          key={index} 
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-mono border border-blue-200"
                        >
                          {ticker.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{idea.analysis}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <span className="text-gray-500 text-xs">
                      {new Date(idea.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <div className="flex items-center space-x-1 text-green-600">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs font-medium">Live</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No trading ideas available at the moment.</p>
              <p className="text-gray-500 text-sm mt-2">Check back tomorrow for fresh market analysis.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <Logo size="sm" />
              <span className="text-gray-900 font-semibold text-lg">SpeculationAssist</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Contact</a>
              <a href="#" className="hover:text-gray-900 transition-colors">FAQ</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <p className="text-gray-500 text-sm">
              © 2025 SpeculationAssist. All rights reserved. Not investment advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
