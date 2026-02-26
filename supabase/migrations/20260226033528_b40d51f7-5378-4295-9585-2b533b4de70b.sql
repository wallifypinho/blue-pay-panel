
-- Tabela de operadores (máximo 5)
CREATE TABLE public.operators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;

-- Público pode ler operadores (para login por slug)
CREATE POLICY "Anyone can view operators"
  ON public.operators FOR SELECT
  USING (true);

-- Público pode inserir (admin sem auth cria operadores)
CREATE POLICY "Anyone can insert operators"
  ON public.operators FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update operators"
  ON public.operators FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete operators"
  ON public.operators FOR DELETE
  USING (true);

-- Adicionar operator_id aos pagamentos
ALTER TABLE public.payments
  ADD COLUMN operator_id UUID REFERENCES public.operators(id) ON DELETE CASCADE;
