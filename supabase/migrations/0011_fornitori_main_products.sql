-- DÆMON Production HQ — Fornitori: prodotti principali (§12.2 layout).
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0010 → Run.
-- Idempotente e transazionale.
--
-- Una colonna testo libera: i prodotti principali del fornitore
-- (es. "Leggings, Top"), mostrata come colonna della tabella Fornitori.
-- Niente RLS né bucket da toccare.

begin;

alter table public.fornitori
  add column if not exists main_products text;

commit;
