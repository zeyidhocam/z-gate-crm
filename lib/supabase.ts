
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

type MockResponse<T> = {
    data: T | null
    error: { message: string } | null
}

type MockQueryBuilder<T> = {
    select: () => MockQueryBuilder<T>
    insert: () => MockQueryBuilder<T>
    update: () => MockQueryBuilder<T>
    eq: () => MockQueryBuilder<T>
    in: () => MockQueryBuilder<T>
    order: () => MockQueryBuilder<T>
    single: () => MockQueryBuilder<T>
    then: (resolve: (value: MockResponse<T>) => void) => Promise<void>
}

type MockSupabaseClient = {
    from: () => {
        select: () => MockQueryBuilder<unknown[]>
        insert: () => MockQueryBuilder<null>
        update: () => MockQueryBuilder<null>
    }
    auth: {
        signInWithPassword: () => Promise<{ data: { user: null; session: null }; error: { message: string } }>
        getUser: () => Promise<{ data: { user: null }; error: null }>
        getSession: () => Promise<{ data: { session: null }; error: null }>
        onAuthStateChange: () => { data: { subscription: { unsubscribe: () => void } } }
    }
}

const createMockQueryBuilder = <T,>(data: T | null): MockQueryBuilder<T> => {
    const response: MockResponse<T> = {
        data,
        error: { message: 'Supabase not configured' }
    }

    const builder: MockQueryBuilder<T> = {
        select: () => builder,
        insert: () => builder,
        update: () => builder,
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        single: () => builder,
        then: (resolve) => Promise.resolve(resolve(response))
    }

    return builder
}

const selectBuilder = createMockQueryBuilder<unknown[]>([])
const writeBuilder = createMockQueryBuilder<null>(null)

let client: SupabaseClient | null = null

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
} catch (error) {
    console.warn('Supabase client initialization failed:', error)
}

// Fallback mock client
const mockClient: MockSupabaseClient = {
    from: () => ({
        select: () => selectBuilder,
        insert: () => writeBuilder,
        update: () => writeBuilder,
    }),
    auth: {
        signInWithPassword: () => Promise.resolve({
            data: { user: null, session: null },
            error: { message: 'Bağlantı ayarları eksik! Lütfen .env.local dosyasını oluşturun.' }
        }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
    }
}

export const supabase = client ?? mockClient
export const isSupabaseConfigured = !!client
