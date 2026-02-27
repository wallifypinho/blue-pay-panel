
-- Add operator_id to gateway_configs so each operator can have their own gateways
ALTER TABLE public.gateway_configs
ADD COLUMN operator_id uuid REFERENCES public.operators(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_gateway_configs_operator_id ON public.gateway_configs(operator_id);
