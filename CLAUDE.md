# CLAUDE.md — Z-Gate CRM Proje Rehberi

## 1. Proje Özeti

**Z-Gate CRM**, offline rezervasyon yönetimi için geliştirilmiş, premium koyu temalı bir Müşteri İlişkileri Yönetim (CRM) sistemidir. Türkiye pazarına yönelik, Türkçe arayüze sahip, modern bir full-stack web uygulamasıdır.

---

## 2. Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| Arayüz | React 19, TypeScript 5 |
| Stil | Tailwind CSS 4, PostCSS |
| UI Bileşenleri | shadcn/ui (New York stili), Radix UI |
| İkonlar | Lucide React |
| Grafikler | Recharts |
| Tarih | date-fns, react-day-picker |
| Bildirimler | Sonner (toast) |
| Veritabanı | Supabase (PostgreSQL) |
| Kimlik Doğrulama | Supabase Auth + SSR |
| Dağıtım | Vercel |
| Zamanlı Görevler | Vercel Cron (günlük rapor, 20:00 UTC) |

---

## 3. Proje Yapısı

```
z-gate-crm/
├── app/                    # Next.js App Router sayfaları
│   ├── layout.tsx          # Ana layout (lang="tr")
│   ├── page.tsx            # Dashboard ana sayfa
│   ├── globals.css         # Global stiller
│   ├── api/                # API rotaları
│   │   ├── cron/daily-report/  # Günlük rapor cron job
│   │   └── telegram/       # Telegram webhook & gönderim
│   ├── analysis/           # Analiz sayfası
│   ├── calendar/           # Takvim yönetimi
│   ├── clients/            # Müşteri yönetimi
│   ├── customers/          # Müşteri adayları
│   ├── finance/            # Finans & gider takibi
│   ├── login/              # Giriş sayfası
│   ├── reminders/          # Hatırlatıcılar
│   ├── reservations/       # Rezervasyonlar
│   └── settings/           # Ayarlar
├── components/             # React bileşenleri
│   ├── ui/                 # shadcn/ui bileşen kütüphanesi
│   ├── providers/          # Context sağlayıcıları
│   ├── charts/             # Grafik bileşenleri
│   └── settings/           # Ayar bileşenleri
├── lib/                    # Yardımcı kütüphaneler
│   ├── supabase.ts         # Supabase istemci başlatma
│   ├── supabase-server.ts  # Sunucu tarafı Supabase
│   └── utils.ts            # Yardımcı fonksiyonlar
├── supabase/               # Veritabanı şema dosyaları
│   └── schema.sql          # Ana veritabanı şeması
└── middleware.ts            # Auth & yönlendirme middleware
```

---

## 4. Geliştirme Komutları

```bash
npm run dev       # Geliştirme sunucusunu başlat
npm run build     # Üretim derlemesi yap
npm run start     # Üretim sunucusunu başlat
npm run lint      # ESLint ile kod kontrolü yap
```

---

## 5. Ortam Değişkenleri

Projenin çalışması için `.env.local` dosyasında şu değişkenler tanımlı olmalıdır:

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-proje-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

> **Not:** Bu değişkenler tanımlı değilse middleware atlanır ve sistem mock modunda çalışır.

---

## 6. Veritabanı Tabloları (Supabase)

| Tablo | Açıklama |
|-------|----------|
| `leads` | Müşteri adayları / kayıtlar |
| `reservations` | Rezervasyonlar |
| `process_types` | İşlem tipleri (bağlama, büyü bozma vb.) |
| `statuses` | Durum tanımları (bekliyor, teyit, iptal) |
| `payment_statuses` | Ödeme durumları (ödendi, ödenmedi, kapora) |
| `reminders` | Hatırlatıcılar |
| `system_settings` | Sistem ayarları (tema, font, WhatsApp vb.) |
| `expenses` | Gider kayıtları |
| `clients` | Müşteri detayları |

> Tüm tablolarda **Row Level Security (RLS)** aktiftir. Kimlik doğrulaması yapılmış kullanıcılar erişebilir.

---

## 7. Mimari Kurallar ve Prensipler

### Kimlik Doğrulama
- Supabase Auth + SSR kullanılır
- `middleware.ts` tüm rotaları korur (`/login`, statik dosyalar ve API cron/telegram hariç)
- Giriş yapmamış kullanıcılar `/login` sayfasına yönlendirilir

### Yol Takma Adları (Path Aliases)
- `@/*` kök dizine işaret eder (`tsconfig.json` ile tanımlı)
- Örnek: `import { Button } from "@/components/ui/button"`

### UI Bileşen Sistemi
- shadcn/ui (New York stili) kullanılır
- Tüm temel bileşenler `components/ui/` altındadır
- CSS değişkenleri ile tema renkleri yönetilir

---

## 8. Kodlama Standartları (Baş Mimar Yönergesi)

### Rol ve İlişki
- Claude, **üst düzey (Senior) bir Full-Stack Yazılım Mimarı ve teknik ortak** rolündedir
- Proje sahibi kodlama bilmez; vizyona, iş mantığına ve hedeflere hakimdir
- Claude sadece emir alan bir asistan değil; en iyi pratikleri kendi uygulayan, hatalı mantıkları eleştiren bir teknik ortaktır

### İletişim Kuralları
- **Tüm iletişim kesinlikle TÜRKÇE olacaktır**
- Her kritik değişiklik "Bunu neden yaptık?" sorusuna basit ve mantıksal bir dille cevaplanacaktır
- Güvenlik açığı yaratan, sistemi yavaşlatan veya iş mantığına ters düşen talepler reddedilecek ve daha iyi bir alternatif sunulacaktır

### Kod Kalitesi
- **Enterprise düzeyinde kalite:** Temiz (Clean Code), modüler, yeniden kullanılabilir (DRY), bakımı kolay
- Mimari her zaman en yüksek endüstri standartlarında kurulacaktır
- Karmaşık görevler tek seferde yapılmayacak; önce plan sunulacak, onay alınacak, adım adım ilerlenecektir

### İsimlendirme Kuralları
- Tüm **veritabanı tabloları, değişkenler, fonksiyonlar ve dosya isimleri → İngilizce**
- Kullanıcıya yansıyan **tüm ekran metinleri → Türkçe**

### Güvenlik (Oto-Pilot)
- Tüm girdiler doğrulanacak (Input Validation)
- Yetkilendirme katmanları (Auth/Middleware) sağlam tutulacak
- Sıkı hata yönetimi (Error Handling) uygulanacak
- Hata mesajları son kullanıcıya profesyonel bir dille gösterilecek; sistem arka planı asla dışa sızmayacak

---

## 9. Önemli Dosyalar

| Dosya | Ne İşe Yarar |
|-------|-------------|
| `middleware.ts` | Auth kontrolü ve sayfa yönlendirmeleri |
| `lib/supabase.ts` | İstemci tarafı Supabase bağlantısı |
| `lib/supabase-server.ts` | Sunucu tarafı Supabase bağlantısı |
| `components/providers/settings-provider.tsx` | Sistem ayarları context sağlayıcısı |
| `components/Sidebar.tsx` | Ana navigasyon menüsü |
| `components/DashboardContent.tsx` | Dashboard layout ve KPI kartları |
| `app/api/telegram/` | Telegram bot entegrasyonu |
| `app/api/cron/daily-report/` | Günlük otomatik rapor |
| `vercel.json` | Vercel dağıtım ve cron ayarları |

---

## 10. Entegrasyonlar

- **WhatsApp:** Doğrudan mesajlaşma desteği (`WhatsAppButton` bileşeni)
- **Telegram Bot:** Webhook ile komut alma ve mesaj gönderme (`app/api/telegram/`)
- **Vercel Cron:** Günlük rapor oluşturma (her gün 20:00 UTC)
- **Recharts:** Dashboard grafikleri ve analiz görselleştirmeleri
