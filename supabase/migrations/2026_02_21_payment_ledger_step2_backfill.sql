-- Step 2: Backfill payment ledger data from legacy fields

-- 2.1 Existing schedules: normalize due/paid/status
UPDATE public.payment_schedules
SET
  amount_due = COALESCE(NULLIF(amount_due, 0), COALESCE(amount, 0)),
  amount_paid = CASE
    WHEN COALESCE(is_paid, false) = true THEN COALESCE(NULLIF(amount_due, 0), COALESCE(amount, 0))
    ELSE COALESCE(amount_paid, 0)
  END,
  status = CASE
    WHEN COALESCE(is_paid, false) = true THEN 'paid'
    WHEN COALESCE(amount_paid, 0) > 0 THEN 'partially_paid'
    ELSE 'pending'
  END,
  updated_at = now();

-- 2.2 Create missing payment transactions for already paid schedules
INSERT INTO public.payment_transactions (
  client_id, schedule_id, amount, paid_at, method, source, note, created_at
)
SELECT
  ps.client_id,
  ps.id,
  COALESCE(ps.amount_paid, ps.amount_due, ps.amount, 0) AS amount,
  COALESCE(ps.paid_at, ps.updated_at, now()) AS paid_at,
  'cash' AS method,
  'migration' AS source,
  'Backfill from legacy paid schedule' AS note,
  now()
FROM public.payment_schedules ps
LEFT JOIN public.payment_transactions pt ON pt.schedule_id = ps.id
WHERE
  COALESCE(ps.amount_paid, 0) > 0
  AND pt.id IS NULL;

-- 2.3 For clients with legacy payment_balance and no open schedules, create one open schedule
INSERT INTO public.payment_schedules (
  client_id, amount, amount_due, amount_paid, due_date, is_paid, status, installment_no, source, note, created_at, updated_at
)
SELECT
  c.id,
  c.payment_balance,
  c.payment_balance,
  0,
  COALESCE(c.payment_due_date, now() + interval '7 day'),
  false,
  'pending',
  1,
  'migration',
  'Backfill from clients.payment_balance',
  now(),
  now()
FROM public.clients c
WHERE
  COALESCE(c.payment_balance, 0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.payment_schedules ps
    WHERE ps.client_id = c.id
      AND COALESCE(ps.amount_due, ps.amount, 0) - COALESCE(ps.amount_paid, 0) > 0
  );

-- 2.4 For confirmed clients with legacy payment_status and no open schedules, create one open schedule from price_agreed
INSERT INTO public.payment_schedules (
  client_id, amount, amount_due, amount_paid, due_date, is_paid, status, installment_no, source, note, created_at, updated_at
)
SELECT
  c.id,
  c.price_agreed,
  c.price_agreed,
  0,
  COALESCE(c.payment_due_date, now() + interval '7 day'),
  false,
  'pending',
  1,
  'migration',
  'Backfill from clients.payment_status',
  now(),
  now()
FROM public.clients c
WHERE
  c.is_confirmed = true
  AND COALESCE(c.price_agreed, 0) > 0
  AND c.payment_status IN ('Kapora', 'Ödenmedi')
  AND NOT EXISTS (
    SELECT 1
    FROM public.payment_schedules ps
    WHERE ps.client_id = c.id
      AND COALESCE(ps.amount_due, ps.amount, 0) - COALESCE(ps.amount_paid, 0) > 0
  );
