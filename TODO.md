# TODO — backlog redesign v3

## Fase 6 — Rifiniture
- [ ] **Command palette: apertura diretta della scheda per TUTTE le entità** (oggi solo Articoli). Tech pack, campioni, fornitori, gadget, inspo, link, media e chat oggi navigano solo alla sezione: serve rendere apribile dall'esterno il dettaglio/modal di ciascuna pagina (stesso pattern usato per ArticoloDetail a livello App).
- [ ] Skeleton loading (Media Studio e liste immagini)
- [ ] Count-up animato dei numeri stat in Overview
- [ ] Empty states illustrati (icona line-art + CTA)
- [ ] Conferme distruttive custom al posto di confirm() + undo via toast (5s)
- [ ] Shimmer sulla progressbar quando avanza

## Vincoli per le fasi future
- **Fase 5 (widget persistenti)**: su mobile il widget bottom-sheet deve usare lo slot unico `activeSheet` nel NavContext e il token `--z-sheet` — un solo sheet aperto alla volta, mai due sovrapposti (la bottom-nav della Fase 2 è già costruita così).
