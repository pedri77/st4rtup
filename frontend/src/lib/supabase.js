import { createClient } from '@supabase/supabase-js'

// Hardcoded Supabase config (safe for frontend - anon key is public)
const supabaseUrl = 'https://dszhaxyzrnsgjlabtvqx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzemhheHl6cm5zZ2psYWJ0dnF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTIwNzMsImV4cCI6MjA4NzYyODA3M30.mDb0RupHEPMtFsYZ4G--XI6CNwIZXljGPZZE1-Ruubg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
