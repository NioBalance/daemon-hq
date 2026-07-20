-- DÆMON Production HQ — Riunioni: link stanza online + piattaforma.
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0013 → Run.
-- Idempotente e transazionale.
--
-- link_riunione = URL della stanza (Meet/Zoom/Teams…), incollato a mano
-- dopo averla creata sul servizio. piattaforma = quale servizio, per
-- mostrare l'icona giusta e il bottone "Crea stanza". La generazione
-- automatica via API resta backlog avanzato.

begin;

alter table public.meetings
  add column if not exists link_riunione text,
  add column if not exists piattaforma text
    check (piattaforma is null or piattaforma in ('meet', 'zoom', 'teams', 'altro'));

commit;
