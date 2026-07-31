import { DAEMON_LOGO_PATH } from './daemonLogoGeometry'

/** Il core DÆMON, fallback SVG "ologramma": il contorno VERO del logo a 8
 *  punte (daemonLogoGeometry) in wireframe stroke-only — il glow è un layer
 *  di stroke largo a bassa opacità, niente filtri pesanti. Attorno, 2 orbite
 *  ellittiche inclinate con un punto orbitante ciascuna: il punto ruota
 *  dentro un frame scale(1, ry/rx), così percorre davvero l'ellisse.
 *  Solo CSS keyframes; con prefers-reduced-motion resta statico. */
export default function DaemonCore({ size = 140 }: { size?: number }) {
  // sotto i 60px (FAB, testata assistente) gli stroke in unità viewBox
  // diventerebbero frazioni di pixel: si ispessisce tutto in proporzione
  const small = size < 60
  const wire = small ? 2.6 : 0.9
  const glow = small ? 6 : 3
  return (
    <span className="core-wrap" style={{ width: size, height: size }} aria-hidden>
      <span className="core-glow" />
      <svg viewBox="-50 -50 100 100" width={size} height={size}>
        {/* orbita 1 — inclinata, punto orario */}
        <g transform="rotate(-14)">
          <ellipse rx="45" ry="38" fill="none" stroke="var(--ember)" strokeWidth={small ? 1.3 : 0.45} strokeDasharray="2.5 7" strokeLinecap="round" opacity="0.4" />
          <g transform="scale(1 0.845)">
            <g className="core-ring r1">
              <circle cx="45" cy="0" r={small ? 3 : 1.5} fill="var(--ember)" />
            </g>
          </g>
        </g>
        {/* orbita 2 — inclinazione opposta, punto antiorario */}
        <g transform="rotate(17)">
          <ellipse rx="47.5" ry="33" fill="none" stroke="var(--ember)" strokeWidth={small ? 1 : 0.35} strokeDasharray="1 10" strokeLinecap="round" opacity="0.28" />
          <g transform="scale(1 0.695)">
            <g className="core-ring r2">
              <circle cx="47.5" cy="0" r={small ? 2.2 : 1.1} fill="var(--ember)" opacity="0.8" />
            </g>
          </g>
        </g>
        {/* wireframe del logo: contorno reale, glow = stroke largo sotto */}
        <g className="core-holo-star" transform="scale(0.72) translate(-50 -50)">
          <path d={DAEMON_LOGO_PATH} fill="none" stroke="var(--ember)" strokeWidth={glow} opacity="0.16" strokeLinejoin="round" strokeLinecap="round" />
          <path d={DAEMON_LOGO_PATH} fill="none" stroke="var(--ember)" strokeWidth={wire} opacity="0.92" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      </svg>
    </span>
  )
}
