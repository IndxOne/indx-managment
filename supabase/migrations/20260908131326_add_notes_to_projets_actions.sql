ALTER TABLE public.projets_actions
  ADD COLUMN notes jsonb NOT NULL DEFAULT '[]'::jsonb;
