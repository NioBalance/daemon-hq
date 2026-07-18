# TODO — backlog redesign v3

## Fase 6 — Rifiniture
- [x] **Command palette: apertura diretta della scheda per TUTTE le entità** (fatto in Fase 6/C) (oggi solo Articoli). Tech pack, campioni, fornitori, gadget, inspo, link, media e chat oggi navigano solo alla sezione: serve rendere apribile dall'esterno il dettaglio/modal di ciascuna pagina (stesso pattern usato per ArticoloDetail a livello App).
- [x] Skeleton loading (Media Studio e liste immagini) — Fase 6/A
- [x] Count-up animato dei numeri stat in Overview — Fase 5
- [x] Empty states illustrati (icona line-art + CTA) — Fase 6/A
- [x] Conferme distruttive custom + undo via toast 5s — Fase 6/B
- [x] Shimmer sulla progressbar — Fase 6/A

## Vincoli per le fasi future
- **Fase 5 (widget persistenti)**: su mobile il widget bottom-sheet deve usare lo slot unico `activeSheet` nel NavContext e il token `--z-sheet` — un solo sheet aperto alla volta, mai due sovrapposti (la bottom-nav della Fase 2 è già costruita così).
