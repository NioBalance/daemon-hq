import { useEffect, useRef, useState } from 'react'
import { m, useReducedMotion } from 'framer-motion'
import { NAV_GROUPS, isEntryActive, type NavGroup, type TabKey } from '../lib/tabs'
import { useNav } from '../lib/navigation'
import { useProximity } from '../lib/useProximity'

/** Un gruppo della nav con le sue "spider lines": SVG overlay che disegna
 *  path curvi (quadratic bezier) dal bordo inferiore del titolo al top di
 *  ogni voce, misurando le posizioni reali (ResizeObserver + resize).
 *  Le linee si disegnano on-mount (pathLength via Framer); la linea della
 *  voce hoverata/attiva si intensifica. Sotto reduced-motion sono statiche;
 *  su mobile la nav desktop non esiste proprio (<1200px). */
function NavGroupBlock({ group, activeTab }: { group: NavGroup; activeTab: TabKey }) {
  const { goEntry, archTab } = useNav()
  const reduceMotion = useReducedMotion()
  const groupRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [paths, setPaths] = useState<string[]>([])
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [hotIdx, setHotIdx] = useState<number | null>(null)

  useEffect(() => {
    const el = groupRef.current
    if (!el) return
    let raf = 0
    const measure = () => {
      raf = 0
      const t = titleRef.current
      if (!t) return
      const g = el.getBoundingClientRect()
      const tr = t.getBoundingClientRect()
      const sx = tr.left + tr.width / 2 - g.left
      const sy = tr.bottom - g.top
      const next: string[] = []
      for (const btn of itemRefs.current) {
        if (!btn) continue
        const r = btn.getBoundingClientRect()
        const ex = r.left + r.width / 2 - g.left
        const ey = r.top - g.top + 2
        // Controllo vicino alla verticale del titolo: la linea scende e poi
        // si apre a ventaglio verso la voce, stile costellazione.
        const cx = sx + (ex - sx) * 0.18
        const cy = sy + (ey - sy) * 0.9
        next.push(`M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`)
      }
      setPaths(next)
      setBox({ w: el.offsetWidth, h: el.offsetHeight })
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    schedule()
    const ro = new ResizeObserver(schedule)
    ro.observe(el)
    window.addEventListener('resize', schedule)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', schedule)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [group.entries.length])

  const activeIdx = group.entries.findIndex((e) => isEntryActive(e, activeTab, archTab))

  return (
    <div className="nav-group" ref={groupRef} data-prox>
      {box.w > 0 && paths.length > 0 && (
        <svg className="spider" width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} aria-hidden="true">
          <defs>
            <linearGradient id={`spider-${group.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E2382A" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#E2382A" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {paths.map((d, i) => (
            <m.path
              key={i}
              d={d}
              className={hotIdx === i || activeIdx === i ? 'hot' : undefined}
              stroke={`url(#spider-${group.id})`}
              strokeWidth={1}
              fill="none"
              initial={reduceMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.8, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] }
              }
            />
          ))}
        </svg>
      )}
      <div className="nav-group-title" ref={titleRef}>
        {group.title}
      </div>
      <div className="nav-group-items">
        {group.entries.map((entry, i) => (
          <button
            key={entry.id}
            ref={(el) => {
              itemRefs.current[i] = el
            }}
            className={`nav-item${isEntryActive(entry, activeTab, archTab) ? ' active' : ''}`}
            onClick={() => goEntry(entry)}
            onMouseEnter={() => setHotIdx(i)}
            onMouseLeave={() => setHotIdx((h) => (h === i ? null : h))}
          >
            {entry.label}
            {entry.soon && <span className="soon-pill">Soon</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function NavGroups({ activeTab }: { activeTab: TabKey }) {
  const navRef = useRef<HTMLElement | null>(null)
  useProximity(navRef)

  return (
    <nav className="nav-groups" ref={navRef} aria-label="Sezioni">
      {NAV_GROUPS.map((group) => (
        <NavGroupBlock key={group.id} group={group} activeTab={activeTab} />
      ))}
    </nav>
  )
}
