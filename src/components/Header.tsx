'use client'

import { TrendingUp, Menu, X } from "lucide-react"
import { useState } from "react"

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white">SpeculationAssist</h1>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#" className="text-slate-300 hover:text-white transition-colors">Newsletter</a>
            <a href="#" className="text-slate-300 hover:text-white transition-colors">Analysis</a>
            <a href="#" className="text-slate-300 hover:text-white transition-colors">Portfolio</a>
            <a href="#" className="text-slate-300 hover:text-white transition-colors">About</a>
            <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
              Subscribe
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-slate-700 pt-4">
            <div className="flex flex-col space-y-3">
              <a href="#" className="text-slate-300 hover:text-white transition-colors">Newsletter</a>
              <a href="#" className="text-slate-300 hover:text-white transition-colors">Analysis</a>
              <a href="#" className="text-slate-300 hover:text-white transition-colors">Portfolio</a>
              <a href="#" className="text-slate-300 hover:text-white transition-colors">About</a>
              <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors w-full">
                Subscribe
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
