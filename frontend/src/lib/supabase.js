import { createClient } from '@supabase/supabase-js'

// St4rtup Supabase project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ufwjtzvfclnmbskemdjp.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmd2p0enZmY2xubWJza2VtZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzgyODUsImV4cCI6MjA5MDAxNDI4NX0.GuvVWiua6mbjj6ZgH2EV_YSvpa6kzdWkglxn90b4ais'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
