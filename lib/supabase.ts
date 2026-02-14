
import { createBrowserClient } from '@supabase/ssr'

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
        client = createBrowserClient(supabaseUrl, supabaseAnonKey)
    }
} catch {
    // Supabase baslatma hatasi gizlendi
}

// Fallback mock client
const createMockBuilder = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
        select: () => builder,
        insert: () => builder,
        update: () => builder,
        delete: () => builder,
        eq: () => builder,
        neq: () => builder,
        gt: () => builder,
        lt: () => builder,
        gte: () => builder,
        lte: () => builder,
        in: () => builder,
        is: () => builder,
        like: () => builder,
        ilike: () => builder,
        contains: () => builder,
        range: () => builder,
        single: () => builder,
        maybeSingle: () => builder,
        order: () => builder,
        limit: () => builder,
        // Mock 'then' to make it simpler to await
        then: (resolve: any) => resolve({ data: [], error: { message: 'Supabase not configured' } })
    }
    return builder
}

const mockClient = {
    from: () => createMockBuilder(),
    auth: {
        signInWithPassword: () => Promise.resolve({
            data: { user: null, session: null },
            error: { message: 'Bağlantı ayarları eksik! Lütfen .env.local dosyasını oluşturun.' }
        }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        signOut: () => Promise.resolve({ error: null }),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

export const supabase = client || mockClient
export const isSupabaseConfigured = !!client
