'use client'

import { useState, useEffect } from 'react'
import { Brain, Mail, Inbox, ArrowRight, BarChart3, Clock, Target } from "lucide-react"
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900" style={{backgroundColor: '#2a2a2a'}}>
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/30 backdrop-blur-sm" style={{backgroundColor: 'rgba(42, 42, 42, 0.3)'}}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Logo size="md" showPulse={true} />
              <h1 className="text-2xl font-bold text-white">SpeculationAssist</h1>
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
            <span className="text-green-300 text-sm font-medium">Powered by Advanced AI</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Daily Trading Ideas
            <br />
            <span className="bg-gradient-to-r from-green-400 to-red-400 bg-clip-text text-transparent">
              Powered by AI
            </span>
          </h1>
          
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Get 3 AI-analyzed trading opportunities delivered every morning. 
            Our algorithms scan thousands of stocks to find the best setups.
          </p>

          {/* Email Signup Form */}
          <div className="max-w-md mx-auto mb-8">
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address" 
                  required
                  className="w-full pl-10 pr-4 py-4 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
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
              <p className={`mt-4 text-sm ${message.includes('Success') || message.includes('subscribed') || message.includes('reactivated') ? 'text-green-400' : 'text-red-400'}`}>
                {message}
              </p>
            )}
          </div>

          <p className="text-slate-400 text-sm">
            Join 10,000+ traders • No spam, unsubscribe anytime
          </p>
        </div>

        {/* How It Works Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-br from-green-500/20 to-slate-500/20 border border-green-500/30 rounded-2xl p-8 mb-6">
                <Brain className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">AI Analysis</h3>
                <p className="text-slate-300">
                  Our AI scans market data, news, and technical indicators to identify high-probability trading setups.
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-br from-red-500/20 to-slate-500/20 border border-red-500/30 rounded-2xl p-8 mb-6">
                <Target className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">3 Daily Ideas</h3>
                <p className="text-slate-300">
                  Receive exactly 3 curated trading opportunities each morning with entry points and risk management.
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-br from-gray-600/20 to-gray-700/20 border border-gray-600/30 rounded-2xl p-8 mb-6" style={{backgroundColor: 'rgba(42, 42, 42, 0.2)', borderColor: 'rgba(42, 42, 42, 0.4)'}}>
                <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Inbox Delivery</h3>
                <p className="text-slate-300">
                  Get your daily trading ideas delivered straight to your inbox before market open.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Latest Market Analysis Section */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">Latest Market Analysis</h2>
            <div className="flex items-center text-slate-400 text-sm">
              <Clock className="h-4 w-4 mr-1" />
              Updated daily at 6:00 AM EST
            </div>
          </div>
          
          {tradingIdeas.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tradingIdeas.slice(0, 3).map((idea) => (
                <div 
                  key={idea.id} 
                  className="bg-gray-800/30 border border-gray-700 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-800/40 hover:border-gray-600 transition-all duration-200 cursor-pointer" 
                  style={{backgroundColor: 'rgba(42, 42, 42, 0.3)', borderColor: 'rgba(42, 42, 42, 0.5)'}}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-green-400" />
                      <span className="font-bold text-white text-lg">{idea.theme}</span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                      ANALYSIS
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {idea.tickers.split(',').map((ticker, index) => (
                        <span 
                          key={index} 
                          className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-mono border border-blue-500/30"
                        >
                          {ticker.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <p className="text-slate-300 text-sm leading-relaxed mb-4">{idea.analysis}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                    <span className="text-slate-400 text-xs">
                      {new Date(idea.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <div className="flex items-center space-x-1 text-green-400">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs font-medium">Live</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-12 text-center backdrop-blur-sm" style={{backgroundColor: 'rgba(42, 42, 42, 0.3)', borderColor: 'rgba(42, 42, 42, 0.5)'}}>
              <BarChart3 className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No trading ideas available at the moment.</p>
              <p className="text-slate-500 text-sm mt-2">Check back tomorrow for fresh market analysis.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700/50 bg-gray-900/30 backdrop-blur-sm" style={{backgroundColor: 'rgba(42, 42, 42, 0.3)'}}>
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <Logo size="sm" />
              <span className="text-white font-semibold text-lg">SpeculationAssist</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
              <a href="#" className="hover:text-white transition-colors">FAQ</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700/50 text-center">
            <p className="text-slate-400 text-sm">
              © 2025 SpeculationAssist. All rights reserved. Not investment advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
