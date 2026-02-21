-- Step 4: Optional restore for legacy paid clients with no ledger rows
-- Use this after Step 1-3 when historical fully paid clients were mapped to "Ödenmedi"
-- because they had no payment_schedules rows.

-- 4.1 Create paid schedules for likely legacy-paid clients
WITH candidate_clients AS (
  SELECT
    c.id AS client_id,
    COALESCE(c.price_agreed, 0) AS total_amount,
    COALESCE(c.confirmed_at, now()) AS paid_date
  FROM public.clients c
  WHERE c.is_confirmed = true
    AND COALESCE(c.price_agreed, 0) > 0
    AND (
      c.payment_status = 'Ödendi'
      OR c.stage = 4
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.payment_schedules ps
      WHERE ps.client_id = c.id
    )
),
inserted_paid_schedules AS (
  INSERT INTO public.payment_schedules (
    client_id,
    amount,
    amount_due,
    amount_paid,
    due_date,
    is_paid,
    paid_at,
    status,
    installment_no,
    source,
    note,
    created_at,
    updated_at
  )
  SELECT
    cc.client_id,
    cc.total_amount,
    cc.total_amount,
    cc.total_amount,
    cc.paid_date,
    true,
    cc.paid_date,
    'paid',
    1,
    'migration',
    'Restore legacy fully-paid client (step4)',
    now(),
    now()
  FROM candidate_clients cc
  RETURNING id, client_id, amount_paid, paid_at
)
INSERT INTO public.payment_transactions (
  client_id,
  schedule_id,
  amount,
  paid_at,
  method,
  source,
  note,
  created_at
)
SELECT
  ips.client_id,
  ips.id,
  ips.amount_paid,
  ips.paid_at,
  'other',
  'migration',
  'Restore legacy fully-paid client (step4)',
  now()
FROM inserted_paid_schedules ips;

-- 4.2 Re-sync payment_status from ledger (corrected rule: total_due=0 => Ödenmedi)
WITH client_agg AS (
  SELECT
    c.id AS client_id,
    COALESCE(SUM(COALESCE(ps.amount_due, ps.amount, 0)), 0) AS total_due,
    COALESCE(SUM(COALESCE(ps.amount_paid, 0)), 0) AS total_paid
  FROM public.clients c
  LEFT JOIN public.payment_schedules ps ON ps.client_id = c.id
  GROUP BY c.id
),
computed AS (
  SELECT
    client_id,
    CASE
      WHEN total_due <= 0 THEN 'Ödenmedi'
      WHEN GREATEST(total_due - total_paid, 0) = 0 THEN 'Ödendi'
      WHEN total_paid > 0 THEN 'Kapora'
      ELSE 'Ödenmedi'
    END AS computed_payment_status
  FROM client_agg
)
UPDATE public.clients c
SET payment_status = computed.computed_payment_status
FROM computed
WHERE c.id = computed.client_id;

-- 4.3 Quick result summary
SELECT payment_status, COUNT(*) AS count
FROM public.clients
GROUP BY payment_status
ORDER BY count DESC;
