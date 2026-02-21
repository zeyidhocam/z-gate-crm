-- Add "starred client" support and payment-plan reminder linkage

-- 1) Clients: star/pin fields
ALTER TABLE IF EXISTS public.clients
  ADD COLUMN IF NOT EXISTS is_starred boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.clients
  ADD COLUMN IF NOT EXISTS starred_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_clients_is_starred
  ON public.clients (is_starred, starred_at DESC NULLS LAST);

-- 2) Reminders: link to payment schedule rows
DO $$
BEGIN
  IF to_regclass('public.reminders') IS NOT NULL THEN
    ALTER TABLE public.reminders
      ADD COLUMN IF NOT EXISTS schedule_id uuid REFERENCES public.payment_schedules(id) ON DELETE CASCADE;

    ALTER TABLE public.reminders
      ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

    -- NOTE:
    -- ON CONFLICT (schedule_id) cannot target a partial unique index.
    -- Drop old partial index variant (if any), dedupe, then create full unique index.
    DROP INDEX IF EXISTS public.ux_reminders_schedule_id;

    DELETE FROM public.reminders older
    USING public.reminders newer
    WHERE older.schedule_id IS NOT NULL
      AND newer.schedule_id = older.schedule_id
      AND older.ctid < newer.ctid;

    CREATE UNIQUE INDEX IF NOT EXISTS ux_reminders_schedule_id
      ON public.reminders (schedule_id);

    CREATE INDEX IF NOT EXISTS idx_reminders_source
      ON public.reminders (source);

    -- Backfill one reminder row per existing unpaid payment schedule.
    INSERT INTO public.reminders (
      client_id,
      schedule_id,
      title,
      description,
      reminder_date,
      is_completed,
      source
    )
    SELECT
      ps.client_id,
      ps.id,
      'Odeme takibi: ' || COALESCE(c.full_name, c.name, 'Musteri'),
      COALESCE(
        CASE
          WHEN ps.installment_no IS NOT NULL THEN 'Taksit #' || ps.installment_no::text
          ELSE NULL
        END,
        ''
      ) || CASE WHEN ps.note IS NOT NULL THEN ' - ' || ps.note ELSE '' END,
      ps.due_date,
      CASE
        WHEN COALESCE(ps.amount_due, ps.amount, 0) - COALESCE(ps.amount_paid, 0) <= 0 THEN true
        ELSE false
      END,
      'payment_schedule'
    FROM public.payment_schedules ps
    LEFT JOIN public.clients c ON c.id = ps.client_id
    ON CONFLICT (schedule_id) DO UPDATE
    SET
      client_id = EXCLUDED.client_id,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      reminder_date = EXCLUDED.reminder_date,
      is_completed = EXCLUDED.is_completed,
      source = EXCLUDED.source;
  END IF;
END $$;
