'use client'

import { useState } from 'react'
import { Brain, Mail, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { UserMenu } from '@/components/auth/UserMenu'
import AuthModal from '@/components/auth/AuthModal'
import Logo from '@/components/Logo'
import Footer from '@/components/Footer'
import TradingIdeasPreview from '@/components/TradingIdeasPreview'
import { howItWorksIcons } from '@/config/icons'

export default function Home() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin')

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
        body: JSON.stringify({ email })
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

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthModalMode(mode)
    setShowAuthModal(true)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Logo size="md" />
              <h1 className="text-2xl font-bold text-gray-900">SpeculationAssist</h1>
            </div>
            
            {user ? (
              <UserMenu />
            ) : (
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => openAuthModal('signin')}
                  className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => openAuthModal('signup')}
                  className="bg-gradient-to-r from-green-600 to-red-600 hover:from-green-700 hover:to-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Get Started
                </button>
              </div>
            )}
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

          {/* Email Signup Form or User Actions */}
          {user ? (
            <div className="max-w-md mx-auto mb-8">
              <div className="bg-gradient-to-r from-green-50 to-red-50 border border-green-200 rounded-2xl p-6 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Welcome back, {user.user_metadata?.first_name || user.email}!
                </h3>
                <p className="text-gray-600 mb-4">
                  Ready to explore today's trading opportunities?
                </p>
                <button 
                  onClick={() => window.location.href = '/dashboard'}
                  className="bg-gradient-to-r from-green-600 to-red-600 hover:from-green-700 hover:to-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 inline-flex items-center"
                >
                  View Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto mb-8">
              <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-green-600 to-red-600 hover:from-green-700 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 whitespace-nowrap inline-flex items-center"
                >
                  {isLoading ? (
                    'Subscribing...'
                  ) : (
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

              <div className="mt-4 text-center">
                <p className="text-gray-500 text-sm mb-2">
                  Join 10,000+ traders • No spam, unsubscribe anytime
                </p>
                <p className="text-sm text-gray-400">
                  Already have an account?{' '}
                  <button 
                    onClick={() => openAuthModal('signin')}
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* How It Works Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-br from-green-50 to-gray-50 border border-green-200 rounded-2xl p-8 mb-6 hover:shadow-md transition-shadow">
                <img 
                  src={howItWorksIcons.aiAnalysis} 
                  alt="AI Analysis" 
                  className="h-12 w-12 mx-auto mb-4 object-contain"
                />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Analysis</h3>
                <p className="text-gray-600">
                  Our AI scans market data, news, and technical indicators to identify high-probability trading setups.
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-br from-red-50 to-gray-50 border border-red-200 rounded-2xl p-8 mb-6 hover:shadow-md transition-shadow">
                <img 
                  src={howItWorksIcons.dailyIdeas} 
                  alt="3 Daily Ideas" 
                  className="h-12 w-12 mx-auto mb-4 object-contain"
                />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">3 Daily Ideas</h3>
                <p className="text-gray-600">
                  Receive exactly 3 curated trading opportunities each morning with entry points and risk management.
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-50 to-gray-50 border border-blue-200 rounded-2xl p-8 mb-6 hover:shadow-md transition-shadow">
                <img 
                  src={howItWorksIcons.trackLearn} 
                  alt="Track & Learn" 
                  className="h-12 w-12 mx-auto mb-4 object-contain"
                />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Track & Learn</h3>
                <p className="text-gray-600">
                  Monitor your performance, save favorite strategies, and learn from detailed market analysis.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Ideas Preview Section */}
        <TradingIdeasPreview />

      </main>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authModalMode}
      />
      
      {/* Footer */}
      <Footer />
    </div>
  )
}
