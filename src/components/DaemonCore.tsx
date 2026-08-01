import { DAEMON_LOGO_PATH } from './daemonLogoGeometry'

/** Il core DÆMON, fallback SVG: la stessa "bolla" in teca di vetro del core
 *  GL (sfera, riflessi e ombra sono layer CSS condivisi — .core-orb-*), col
 *  contorno vero del logo in wireframe dentro e due punti orbitanti attorno
 *  come particelle leggere. Solo CSS keyframes; con prefers-reduced-motion
 *  resta una bolla statica. */
export default function DaemonCore({ size = 176 }: { size?: number }) {
  const small = size < 60
  const wire = small ? 2.6 : 1.1
  const glow = small ? 6 : 3.4
  return (
    <span className="core-wrap core-orb" style={{ width: size, height: size }} aria-hidden>
      <span className="core-orb-shadow" />
      <svg viewBox="-50 -50 100 100" width={size} height={size}>
        {/* particelle orbitanti fuori dal vetro */}
        <g transform="rotate(-16)">
          <g transform="scale(1 0.82)">
            <g className="core-ring r1">
              <circle cx="44" cy="0" r={small ? 3 : 1.5} fill="var(--ember)" opacity="0.85" />
            </g>
          </g>
        </g>
        <g transform="rotate(21)">
          <g transform="scale(1 0.7)">
            <g className="core-ring r2">
              <circle cx="46.5" cy="0" r={small ? 2.2 : 1.1} fill="var(--ember)" opacity="0.6" />
            </g>
          </g>
        </g>
        {/* wireframe del logo dentro la teca (72% del canvas → dentro la sfera) */}
        <g className="core-holo-star" transform="scale(0.62) translate(-50 -50)">
          <path d={DAEMON_LOGO_PATH} fill="none" stroke="var(--ember)" strokeWidth={glow} opacity="0.16" strokeLinejoin="round" strokeLinecap="round" />
          <path d={DAEMON_LOGO_PATH} fill="none" stroke="var(--ember)" strokeWidth={wire} opacity="0.92" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      </svg>
      <span className="core-orb-sphere" />
      <span className="core-orb-spec" />
    </span>
  )
}
