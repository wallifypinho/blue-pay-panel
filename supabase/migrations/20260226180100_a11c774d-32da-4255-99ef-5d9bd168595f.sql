
-- Drop all permissive policies on operators
DROP POLICY IF EXISTS "Anyone can delete operators" ON public.operators;
DROP POLICY IF EXISTS "Anyone can insert operators" ON public.operators;
DROP POLICY IF EXISTS "Anyone can update operators" ON public.operators;
DROP POLICY IF EXISTS "Anyone can view operators" ON public.operators;

-- Operators: only allow public SELECT of non-sensitive fields (slug, name for routing)
-- RLS can't restrict columns, so we keep SELECT but all writes go through edge functions
CREATE POLICY "Public can view operator routing info"
  ON public.operators FOR SELECT
  USING (true);

-- No public INSERT/UPDATE/DELETE - all managed via edge functions with service role

-- Drop all permissive policies on payments  
DROP POLICY IF EXISTS "Anyone can create payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can delete payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can update payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;

-- Payments: keep SELECT public (needed for payment page)
CREATE POLICY "Public can view payments"
  ON public.payments FOR SELECT
  USING (true);

-- No public INSERT/UPDATE/DELETE - all managed via edge functions with service role
