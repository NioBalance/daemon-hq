-- DÆMON Production HQ — Fornitori: logo, telefono, chat diretta (§12.2).
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0008 → Run.
-- Idempotente e transazionale.
--
-- Tre campi strutturati sulla scheda fornitore: il logo (path nel bucket
-- media sotto fornitori/, lettura via signed URL come tutto il resto), il
-- telefono e l'URL completo della chat diretta (https://wa.me/… oppure
-- https://instagram.com/…). Il campo libero `contatto` resta invariato.
-- Niente RLS da toccare (policy condivise già coprono le colonne nuove),
-- niente bucket da toccare (i formati immagine base sono ammessi ovunque
-- dalla policy della 0008).

begin;

alter table public.fornitori
  add column if not exists logo_path text,
  add column if not exists telefono  text,
  add column if not exists chat_url  text;

commit;
