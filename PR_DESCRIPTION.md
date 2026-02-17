Özet
-----
Bu PR aşağıdaki değişiklikleri içerir:

- Çift kayıt önleme: server-side `POST /api/clients` duplicate-check (telefon/email) ve `forceSave` bayrağı.
- `NewClientDialog` client-side akışı API üzerinden çalışacak şekilde güncellendi.
- `tags` ve `client_tags` için migration eklendi (`migrations/20260217_add_tags_audit_phone_normalized.sql`).
- `audit_logs` tablosu ve örnek trigger eklendi; uygulama katmanında da audit insertleri eklendi (`PaymentScheduleDialog` vb.).
- `RecentActivity` bileşeni eklendi ve müşteri detay dialoglarına yerleştirildi.
- `Ödeme Takibi` sütunu listeden kaldırıldı; ödeme butonları action alanında korunuyor.
- Duplicate cleanup script eklendi: `migrations/20260217_cleanup_duplicates.sql` (preview, backup, delete adımları).
- Küçük TypeScript düzeltmeleri (implicit any hatalarını giderme).


Nasıl test edilir
-----------------
1) Kodları PR branch'ine pushlayın (veya `./scripts/create_pr.sh` çalıştırın).
2) Supabase'de önce duplicate raporunu çalıştırın:
   - `migrations/20260217_duplicate_report.sql` veya `migrations/20260217_cleanup_duplicates.sql` içindeki SELECT'leri çalıştırın.
3) Duplicate temizliğine karar verirseniz, yedek alıp (backup adımı) silme adımını çalıştırın.
4) Migration'ı (tags/audit/phone_normalized) çalıştırın: `migrations/20260217_add_tags_audit_phone_normalized.sql`.
5) Uygulamayı build ediniz (`npm run build`) ve UI üzerinden yeni müşteri ekleyip duplicate akışını test ediniz.


Notlar
-----
- Migration trigger fonksiyonu `current_setting('my.app.user_id', true)` kullanıyor; uygulama tarafından audit yazarken `set_config` yapılmadığı sürece `user_id` null olabilir. Uygulama katmanında audit insertleri tercih edilebilir.
- `CREATE UNIQUE INDEX CONCURRENTLY` gibi komutlar transaction dışında çalıştırılmalıdır; SQL Editor'da ayrı olarak çalıştırın.

Dosyalar
------
- migrations/20260217_add_tags_audit_phone_normalized.sql
- migrations/20260217_duplicate_report.sql
- migrations/20260217_cleanup_duplicates.sql
- app/api/clients/route.ts
- components/NewClientDialog.tsx
- components/RecentActivity.tsx
- components/ClientsContent.tsx
- components/PaymentScheduleDialog.tsx
- scripts/create_pr.sh
- PR_DESCRIPTION.md (bu dosya)

İsterseniz PR açıldıktan sonra CI hatalarını ben düzeltebilirim; Vercel build log'larını paylaşın, ben hızlıca patch'leyeyim.
