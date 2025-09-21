// debug-env.js
console.log('🔍 Environment Debug Check:')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('All environment variables containing SUPABASE:')

const supabaseVars = Object.keys(process.env).filter(key => 
  key.toUpperCase().includes('SUPABASE')
)

if (supabaseVars.length === 0) {
  console.log('❌ No SUPABASE environment variables found!')
} else {
  supabaseVars.forEach(key => {
    console.log(`✅ ${key}: ${process.env[key] ? 'SET' : 'EMPTY'}`)
  })
}

console.log('\nNext.js specific vars:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING')

console.log('\nTotal env vars:', Object.keys(process.env).length)
