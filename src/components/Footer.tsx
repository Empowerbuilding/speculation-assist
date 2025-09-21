import { TrendingUp } from "lucide-react"

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
            <span className="text-gray-900 font-semibold">SpeculationAssist</span>
          </div>
          <div className="flex space-x-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Contact</a>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
          <p>&copy; 2025 SpeculationAssist. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
