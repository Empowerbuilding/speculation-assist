import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SpeculationAssist - AI-Powered Trading Ideas',
  description: 'Get 3 AI-analyzed trading opportunities delivered every morning. Join thousands of traders using our advanced algorithms.',
  keywords: 'trading, AI, stock analysis, trading ideas, market insights, financial analysis',
  authors: [{ name: 'SpeculationAssist' }],
  openGraph: {
    title: 'SpeculationAssist - AI-Powered Trading Ideas',
    description: 'Get 3 AI-analyzed trading opportunities delivered every morning.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpeculationAssist - AI-Powered Trading Ideas',
    description: 'Get 3 AI-analyzed trading opportunities delivered every morning.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}