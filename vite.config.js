import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname)

function parseEnvFile(filePath) {
  const out = {}
  if (!fs.existsSync(filePath)) return out
  const buf = fs.readFileSync(filePath)
  let raw
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    raw = buf.toString('utf16le')
  } else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    raw = buf.toString('utf16be')
  } else {
    raw = buf.toString('utf-8')
  }
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/)
    if (!m) continue
    const key = m[1].trim().replace(/^\uFEFF/, '').replace(/[^\x20-\x7E]/g, '')
    let val = m[2].trim().replace(/\u0000/g, '')
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1)
    out[key] = val
  }
  return out
}

export default defineConfig(() => {
  const envPath = path.join(root, '.env')
  const env = parseEnvFile(envPath)
  const supabaseUrl = env.VITE_SUPABASE_URL || ''
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || ''

  return {
    plugins: [react()],
    envDir: root,
    assetsInclude: ['**/*.PNG', '**/*.png'],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
    },
    server: {
      port: 3000,
      open: true
    }
  }
})
