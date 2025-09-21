import Image from "next/image"
import { TrendingUp } from "lucide-react"
import { LOGO_URL } from "@/lib/config"

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showPulse?: boolean
  className?: string
}

export default function Logo({ size = 'md', showPulse = false, className = '' }: LogoProps) {
  const sizeMap = {
    sm: { class: 'h-12 w-12', pixels: 48 },
    md: { class: 'h-16 w-16', pixels: 64 }, 
    lg: { class: 'h-20 w-20', pixels: 80 }
  }

  // Use the logo URL from config
  const logoUrl = LOGO_URL || "https://ovwmwqiklprhdwuiypax.supabase.co/storage/v1/object/public/website/Adobe%20Express%20-%20file.png"
  
  const sizeConfig = sizeMap[size]
  
  // Debug logs removed for production

  return (
    <div className={`relative ${className}`}>
      {logoUrl ? (
        <Image 
          src={logoUrl} 
          alt="SpeculationAssist Logo" 
          width={sizeConfig.pixels}
          height={sizeConfig.pixels}
          className={`${sizeConfig.class} rounded-lg object-contain`}
          priority={size === 'md'} // Prioritize loading for header logo
        />
      ) : (
        <TrendingUp className={`${sizeConfig.class} text-blue-400`} />
      )}
      {showPulse && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
      )}
    </div>
  )
}
