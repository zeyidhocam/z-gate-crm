-- Step 3: Sync clients.payment_status from ledger + validation report

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
    total_due,
    total_paid,
    GREATEST(total_due - total_paid, 0) AS remaining,
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

-- Validation report (run manually after migration)
-- Shows potential inconsistencies between agreed price and ledger totals.
SELECT
  c.id,
  c.full_name,
  c.price_agreed,
  COALESCE(SUM(COALESCE(ps.amount_due, ps.amount, 0)), 0) AS total_due,
  COALESCE(SUM(COALESCE(ps.amount_paid, 0)), 0) AS total_paid,
  GREATEST(COALESCE(SUM(COALESCE(ps.amount_due, ps.amount, 0)), 0) - COALESCE(SUM(COALESCE(ps.amount_paid, 0)), 0), 0) AS remaining,
  c.payment_status
FROM public.clients c
LEFT JOIN public.payment_schedules ps ON ps.client_id = c.id
GROUP BY c.id, c.full_name, c.price_agreed, c.payment_status
ORDER BY remaining DESC, total_due DESC;
