# API Örnekleri — Clients, Duplicate Check, Tags

Aşağıdaki örnekler Next.js App Router `app/api` rotaları ve `lib/supabase-server.ts` kullanılarak hazırlanmıştır. Projeye göre import yollarını uyarlayın.

---

## 1) `POST /api/clients` — duplicate kontrolü ve insert (örnek)

```ts
// app/api/clients/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const body = await req.json();
  const { name, phone, email } = body;

  // normalize phone in server-side
  const phoneNormalized = phone ? phone.replace(/\D/g, '') : null;

  // check duplicate by normalized phone or email
  const { data: dup, error } = await supabase
    .from('clients')
    .select('*')
    .or(phoneNormalized ? `phone_normalized.eq.${phoneNormalized}` : '', email ? `email.ilike.%${email}%` : '')
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (dup) {
    // 409 Conflict — client-side'da kullanıcıya gösterilecek
    return NextResponse.json({ message: 'duplicate', existing: dup }, { status: 409 });
  }

  // insert
  const { data, error: insertErr } = await supabase
    .from('clients')
    .insert([{ name, phone, phone_normalized: phoneNormalized, email }])
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  return NextResponse.json({ client: data }, { status: 201 });
}
```

> Not: `createServerSupabase` projeye göre `lib/supabase-server.ts` içindeki sunucu-side supabase client generator fonksiyonu olabilir.

---

## 2) Client-side duplicate handling (örnek)

```tsx
// components/NewClientDialog.tsx (submit handler'in özet kısmı)
async function handleSubmit(values) {
  const res = await fetch('/api/clients', { method: 'POST', body: JSON.stringify(values) });
  if (res.status === 409) {
    const json = await res.json();
    // göster: json.existing — kullanıcıya "Benzer kayıt bulundu: güncelle veya iptal" seçenekleri sunun
    openDuplicateModal(json.existing);
    return;
  }
  // devam: başarı veya hata göster
}
```

---

## 3) Tag oluşturma ve ilişkilendirme

```ts
// app/api/tags/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const { name, color } = await req.json();
  const { data, error } = await supabase.from('tags').insert([{ name, color }]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tag: data }, { status: 201 });
}

// app/api/clients/[id]/tags/route.ts (link tag)
export async function POST(req: Request, { params }) {
  const supabase = createServerSupabase();
  const clientId = params.id;
  const { tagId } = await req.json();
  const { data, error } = await supabase.from('client_tags').insert([{ client_id: clientId, tag_id: tagId }]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
```

---

## 4) Audit log yazma (opsiyonel uygulama katmanı örneği)

```ts
// Örnek: her önemli rota sonunda audit_logs tablosuna kayıt ekle
await supabase.from('audit_logs').insert([{ table_name: 'clients', record_id: clientId, user_id: currentUserId, action: 'create', changes: { new: clientRow } }]);
```

---

Bu snippet'leri proje stilinize göre uyarlayabilirsiniz. İsterseniz ben bu dosyaları `app/api` içine gerçek rota dosyası olarak ekleyeyim ve `NewClientDialog.tsx` içinde client-side kontrol için bir patch oluşturayım.
