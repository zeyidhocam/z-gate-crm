-- Step 1: Payment Ledger schema

ALTER TABLE IF EXISTS public.payment_schedules
  ADD COLUMN IF NOT EXISTS amount_due numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS installment_no int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Keep backward compatibility with legacy amount column
UPDATE public.payment_schedules
SET amount_due = COALESCE(NULLIF(amount_due, 0), COALESCE(amount, 0))
WHERE COALESCE(amount_due, 0) = 0;

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  schedule_id uuid NULL REFERENCES public.payment_schedules(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  paid_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL DEFAULT 'cash',
  source text NOT NULL DEFAULT 'web',
  note text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage payment_transactions" ON public.payment_transactions;
CREATE POLICY "Authenticated users can manage payment_transactions"
ON public.payment_transactions
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_payment_schedules_client_due
  ON public.payment_schedules(client_id, due_date);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_status
  ON public.payment_schedules(status, is_paid);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_client_paidat
  ON public.payment_transactions(client_id, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_schedule
  ON public.payment_transactions(schedule_id);
