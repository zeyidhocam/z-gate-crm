-- Duplicate report queries
-- Run these on staging/local before adding UNIQUE constraints

-- 1) Duplicates by normalized phone
SELECT phone_normalized, count(*) as cnt
FROM clients
WHERE phone_normalized IS NOT NULL
GROUP BY phone_normalized
HAVING count(*) > 1
ORDER BY cnt DESC;

-- 2) Duplicates by email
SELECT email, count(*) as cnt
FROM clients
WHERE email IS NOT NULL AND email <> ''
GROUP BY email
HAVING count(*) > 1
ORDER BY cnt DESC;

-- 3) Possible name-similar duplicates (simple heuristic)
SELECT full_name, count(*) as cnt
FROM clients
WHERE full_name IS NOT NULL
GROUP BY full_name
HAVING count(*) > 1
ORDER BY cnt DESC;

-- 4) Example: list potential duplicates of a specific phone
-- SELECT * FROM clients WHERE phone_normalized = '905XXXXXXXX' ORDER BY created_at DESC;
