-- Create enum for vehicle types
CREATE TYPE public.vehicle_type AS ENUM (
  'UNIDADE_MOVEL',
  'UNIDADE_RAIO_X',
  'DOBLO_I',
  'DOBLO_II',
  'UP',
  'PICKUP'
);

-- Create employee_commitments table
CREATE TABLE IF NOT EXISTS public.employee_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_codigo VARCHAR(20) REFERENCES public.users(codigo) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  client_email VARCHAR(200),
  vehicle public.vehicle_type,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE public.employee_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.employee_commitments
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
  
-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_commitments_user_codigo ON public.employee_commitments(user_codigo);
CREATE INDEX IF NOT EXISTS idx_employee_commitments_start_time ON public.employee_commitments(start_time);
CREATE INDEX IF NOT EXISTS idx_employee_commitments_end_time ON public.employee_commitments(end_time);
CREATE INDEX IF NOT EXISTS idx_employee_commitments_vehicle ON public.employee_commitments(vehicle);
