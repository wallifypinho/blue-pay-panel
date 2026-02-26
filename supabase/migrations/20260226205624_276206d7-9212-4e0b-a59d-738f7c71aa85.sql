
-- Table to store gateway configurations (keys stored server-side only)
CREATE TABLE public.gateway_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  api_url TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  public_key TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gateway_configs ENABLE ROW LEVEL SECURITY;
-- No public SELECT policy: keys are only accessible via service role in edge functions

-- Add payment method tracking to payments
ALTER TABLE public.payments ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE public.payments ADD COLUMN gateway_id UUID REFERENCES public.gateway_configs(id);
ALTER TABLE public.payments ADD COLUMN gateway_pix_code TEXT;
ALTER TABLE public.payments ADD COLUMN gateway_qr_code_url TEXT;
