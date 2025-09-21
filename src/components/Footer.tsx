import { TrendingUp } from "lucide-react"

export default function Footer() {
  return (
    <footer className="border-t border-slate-700 bg-slate-900/50 backdrop-blur-sm mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <TrendingUp className="h-6 w-6 text-emerald-400" />
            <span className="text-white font-semibold">SpeculationAssist</span>
          </div>
          <div className="flex space-x-6 text-sm text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-slate-700 text-center text-slate-400 text-sm">
          <p>&copy; 2025 SpeculationAssist. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
