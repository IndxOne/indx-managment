ALTER TABLE public.projets_actions
  DROP CONSTRAINT projets_actions_item_type_check,
  ADD CONSTRAINT projets_actions_item_type_check
    CHECK (item_type = ANY (ARRAY['task'::text, 'request'::text, 'incident'::text, 'maintenance'::text, 'deliverable'::text, 'milestone'::text, 'decision'::text, 'risk'::text]));
