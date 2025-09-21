// load-env.js - Manual environment loader
const fs = require('fs')
const path = require('path')

console.log('🔄 Manually loading .env.local...')

const envPath = path.join(__dirname, '.env.local')
console.log('Looking for .env.local at:', envPath)

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!')
  console.log('Current directory:', __dirname)
  console.log('Files in directory:', fs.readdirSync(__dirname).filter(f => f.startsWith('.')))
  process.exit(1)
}

try {
  const envContent = fs.readFileSync(envPath, 'utf8')
  console.log('📄 File content length:', envContent.length)
  
  const lines = envContent.split(/\r?\n/) // Handle both Windows and Unix line endings
  console.log('📝 Number of lines:', lines.length)
  
  let loadedCount = 0
  lines.forEach((line, index) => {
    line = line.trim()
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts.join('=')
      if (key && value) {
        process.env[key] = value
        console.log(`✅ Line ${index + 1}: Loaded ${key}`)
        loadedCount++
      } else {
        console.log(`⚠️ Line ${index + 1}: Invalid format: "${line}"`)
      }
    }
  })
  
  console.log(`\n🎉 Successfully loaded ${loadedCount} environment variables`)
  
  // Verify the key ones
  console.log('\n🔍 Verification:')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING')
  
} catch (error) {
  console.error('❌ Error reading .env.local:', error.message)
}
