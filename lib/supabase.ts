import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabasePublicKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)?.trim()

let client
let supabaseConfigError: string | null = null

const configIssues: string[] = []
if (!supabaseUrl || supabaseUrl === 'your-project-url' || supabaseUrl.includes('buraya-')) {
    configIssues.push('NEXT_PUBLIC_SUPABASE_URL is missing or placeholder')
}
if (!supabasePublicKey || supabasePublicKey.includes('buraya-')) {
    configIssues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or placeholder')
}

if (configIssues.length === 0) {
    try {
        client = createBrowserClient(supabaseUrl!, supabasePublicKey!)
    } catch (error) {
        supabaseConfigError = error instanceof Error ? error.message : 'Unknown Supabase init error'
        console.error('Supabase client init failed:', supabaseConfigError)
    }
} else {
    supabaseConfigError = configIssues.join('; ')
}

// Fallback mock client
const createMockBuilder = () => {
    const message = supabaseConfigError
        ? `Supabase not configured: ${supabaseConfigError}`
        : 'Supabase not configured'

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
        then: (resolve: (value: { data: unknown[]; error: { message: string } }) => unknown) =>
            resolve({ data: [], error: { message } })
    }
    return builder
}

const mockClient = {
    from: () => createMockBuilder(),
    auth: {
        signInWithPassword: () =>
            Promise.resolve({
                data: { user: null, session: null },
                error: {
                    message: supabaseConfigError
                        ? `Supabase config error: ${supabaseConfigError}`
                        : 'Supabase config missing'
                }
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
export const supabaseInitError = supabaseConfigError
