
-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  destination TEXT NOT NULL,
  destination_emoji TEXT NOT NULL DEFAULT '',
  destination_description TEXT NOT NULL DEFAULT '',
  value NUMERIC NOT NULL,
  pix_code TEXT NOT NULL,
  order_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read payments (clients need to see their payment page)
CREATE POLICY "Anyone can view payments"
  ON public.payments FOR SELECT
  USING (true);

-- Allow anyone to insert payments (admin panel doesn't have auth)
CREATE POLICY "Anyone can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update payments
CREATE POLICY "Anyone can update payments"
  ON public.payments FOR UPDATE
  USING (true);

-- Allow anyone to delete payments
CREATE POLICY "Anyone can delete payments"
  ON public.payments FOR DELETE
  USING (true);
