/** Il core DÆMON: orb SVG animato con l'identità della stella (ember, glow,
 *  pulsazione). Solo CSS keyframes — niente WebGL, niente dipendenze: leggero
 *  e nitido a ogni scala. Hover = anelli più veloci + glow intenso; con
 *  prefers-reduced-motion resta statico col solo glow fisso. */
export default function DaemonCore({ size = 170 }: { size?: number }) {
  return (
    <span className="core-wrap" style={{ width: size, height: size }} aria-hidden>
      <span className="core-glow" />
      <svg viewBox="-50 -50 100 100" width={size} height={size}>
        {/* anelli orbitali */}
        <g className="core-ring r1">
          <circle cx="0" cy="0" r="40" fill="none" stroke="var(--ember)" strokeWidth="0.7" strokeDasharray="3 9" strokeLinecap="round" opacity="0.5" />
        </g>
        <g className="core-ring r2">
          <circle cx="0" cy="0" r="46" fill="none" stroke="var(--ember)" strokeWidth="0.5" strokeDasharray="1 14" strokeLinecap="round" opacity="0.3" />
        </g>
        {/* punto orbitante */}
        <g className="core-ring r3">
          <circle cx="40" cy="0" r="1.8" fill="var(--ember)" />
        </g>
        {/* stella a 4 punte, curva come il logo */}
        <path
          className="core-star"
          d="M0,-30 C2.5,-9 9,-2.5 30,0 C9,2.5 2.5,9 0,30 C-2.5,9 -9,2.5 -30,0 C-9,-2.5 -2.5,-9 0,-30 Z"
          fill="var(--ember)"
        />
      </svg>
    </span>
  )
}
