'use client'

import { useState } from "react"
import { Mail } from "lucide-react"

export default function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      // TODO: Implement newsletter signup with Supabase
      // For now, just simulate the process
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMessage('Thank you for subscribing!')
      setEmail('')
    } catch {
      setMessage('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-8 text-center">
      <Mail className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
      <h3 className="text-2xl font-bold text-white mb-4">Stay Ahead of the Market</h3>
      <p className="text-slate-300 mb-6">
        Get weekly market updates, trading opportunities, and exclusive analysis.
      </p>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email" 
          required
          className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
        />
        <button 
          type="submit"
          disabled={isLoading}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          {isLoading ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      
      {message && (
        <p className={`mt-4 text-sm ${message.includes('Thank you') ? 'text-emerald-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
