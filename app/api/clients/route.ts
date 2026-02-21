import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function normalizePhone(phone?: string | null) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) return `90${digits}`
  if (digits.startsWith('0')) return digits.replace(/^0/, '90')
  return digits
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, phone, email, tags, ...rest } = body

    const phone_normalized = normalizePhone(phone)

    // duplicate check (can be bypassed by forceSave flag)
    const forceSave = !!body.forceSave || !!body.force_save
    if (!forceSave) {
      const filters: string[] = []
      if (phone_normalized) filters.push(`phone_normalized.eq.${phone_normalized}`)
      if (email) filters.push(`email.ilike.%${email}%`)

      if (filters.length > 0) {
        const orFilter = filters.join(',')
        const { data: dup } = await supabase.from('clients').select('id, full_name, phone, email').or(orFilter).limit(1)
        if (dup && dup.length) {
          return NextResponse.json({ message: 'duplicate', existing: dup[0] }, { status: 409 })
        }
      }
    }

    // insert
    const insertRow = {
      name: name || body.full_name,
      full_name: name || body.full_name,
      phone: phone || null,
      phone_normalized,
      email: email || null,
      tags: tags || null,
      ...rest
    }

    const { data, error } = await supabase.from('clients').insert([insertRow]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // optional: write to audit_logs table if exists
    try {
      await supabase.from('audit_logs').insert([{ table_name: 'clients', record_id: data.id, action: 'insert', changes: { new: data } }])
    } catch {
      // ignore audit errors
    }

    return NextResponse.json({ client: data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
