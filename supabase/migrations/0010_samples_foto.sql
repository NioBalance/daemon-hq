-- DÆMON Production HQ — Campioni: foto del campione (§12.2).
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0009 → Run.
-- Idempotente e transazionale.
--
-- Una colonna sola: il path della foto nel bucket media (samples/<uuid>.jpg),
-- upload via ImageUpload con compressione client, lettura via signed URL.
-- Niente RLS né bucket da toccare.

begin;

alter table public.samples
  add column if not exists img_path text;

commit;
