import { Fragment } from 'react'
import { m, useReducedMotion } from 'framer-motion'
import type { DropFase } from '../features/drops/queries'

type StepState = 'done' | 'current' | 'future'

/** Diagramma di flusso della pipeline drop: le fasi come step connessi, quella
 *  corrente (prima non fatta) evidenziata. Connettori e nodi in draw-in
 *  scaglionato al mount, fermi con reduced-motion. */
export default function PhaseFlow({ fasi }: { fasi: DropFase[] }) {
  const reduceMotion = useReducedMotion()
  if (!fasi.length) return null

  const currentIdx = fasi.findIndex((f) => !f.done)
  const stateOf = (i: number): StepState =>
    fasi[i].done ? 'done' : i === currentIdx ? 'current' : 'future'

  const ease = [0.16, 1, 0.3, 1] as const

  return (
    <div className="pflow" role="list" aria-label="Pipeline fasi">
      {fasi.map((f, i) => {
        const st = stateOf(i)
        return (
          <Fragment key={f.id}>
            {i > 0 && (
              <m.span
                className={`pflow-link${fasi[i - 1].done ? ' done' : ''}`}
                aria-hidden
                initial={reduceMotion ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease }}
              />
            )}
            <m.span
              className={`pflow-step ${st}`}
              role="listitem"
              title={`${f.nome}${f.done ? ' — fatta' : st === 'current' ? ' — in corso' : ''}`}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: i * 0.08 + 0.05, ease }}
            >
              <span className="pflow-node">{f.done ? '✓' : i + 1}</span>
              <span className="pflow-label">{f.nome}</span>
            </m.span>
          </Fragment>
        )
      })}
    </div>
  )
}
