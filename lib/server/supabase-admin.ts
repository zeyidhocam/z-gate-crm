import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function getServerSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!serviceRoleKey && !anonKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return { supabaseUrl, serviceRoleKey: serviceRoleKey || null, anonKey }
}

function normalizeAccessToken(accessToken?: string | null): string | null {
  if (!accessToken) return null
  const trimmed = accessToken.trim()
  if (!trimmed) return null
  return trimmed.toLowerCase().startsWith('bearer ')
    ? trimmed.slice(7).trim()
    : trimmed
}

export function createServerSupabaseClient(accessToken?: string | null): SupabaseClient {
  const { supabaseUrl, serviceRoleKey, anonKey } = getServerSupabaseEnv()
  const supabaseKey = serviceRoleKey || anonKey
  if (!supabaseKey) {
    throw new Error('Supabase key is not configured')
  }

  const token = normalizeAccessToken(accessToken)
  const authHeader = token ? `Bearer ${token}` : undefined

  return createClient(supabaseUrl, supabaseKey, {
    global: authHeader
      ? {
          headers: {
            Authorization: authHeader,
          },
        }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
