
-- Add short_code column for shorter payment links
ALTER TABLE public.payments ADD COLUMN short_code TEXT UNIQUE;

-- Generate short codes for existing payments
UPDATE public.payments SET short_code = UPPER(SUBSTRING(id::text, 1, 6)) WHERE short_code IS NULL;

-- Make short_code NOT NULL with a default
ALTER TABLE public.payments ALTER COLUMN short_code SET DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));
ALTER TABLE public.payments ALTER COLUMN short_code SET NOT NULL;

-- Create index for fast lookup
CREATE INDEX idx_payments_short_code ON public.payments(short_code);
