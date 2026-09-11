ALTER TABLE public.projets_actions
  ADD COLUMN linked_action_id uuid REFERENCES public.projets_actions(id) ON DELETE SET NULL;
