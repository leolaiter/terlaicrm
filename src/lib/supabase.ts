import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ttltwudgqvknupbzdhds.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bHR3dWRncXZrbnVwYnpkaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNzY0ODAsImV4cCI6MjA5NDY1MjQ4MH0.ey4oYf2CRgW7KDfGJTwBcNTZlI6U3mKRaVCCYphtdtA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
