
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let client

try {
    // Ensure both are strings and have valid length
    if (
        typeof supabaseUrl === 'string' &&
        supabaseUrl.length > 0 &&
        supabaseUrl !== 'your-project-url' && // Check for default placeholder
        typeof supabaseAnonKey === 'string' &&
        supabaseAnonKey.length > 0
    ) {
        client = createClient(supabaseUrl, supabaseAnonKey)
    }
} catch (error) {
    console.warn('Supabase client initialization failed:', error)
}

// Fallback mock client
const mockClient = {
    from: () => ({
        select: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
        insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    }),
    auth: undefined // ensuring 'auth' in client is false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

export const supabase = client || mockClient
export const isSupabaseConfigured = !!client
