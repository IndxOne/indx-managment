-- Lot 6 §F : "blocked" devient un ActionStatus réel (todo/doing/blocked/
-- waiting/done), pas un badge dérivé. Même patron que
-- 20260908111630_extend_item_type_decision_risk.sql pour item_type.
ALTER TABLE public.projets_actions
  DROP CONSTRAINT projets_actions_status_check,
  ADD CONSTRAINT projets_actions_status_check
    CHECK (status = ANY (ARRAY['todo'::text, 'doing'::text, 'blocked'::text, 'waiting'::text, 'done'::text]));
