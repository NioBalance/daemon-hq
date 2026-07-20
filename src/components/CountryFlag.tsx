import type { ReactNode } from 'react'

/** Bandierine SVG inline da codice paese ISO-2 — le emoji flag non hanno
 *  glifo su Windows, quindi niente emoji. Set limitato ai paesi di
 *  approvvigionamento tessile realistici; fallback pallino neutro. */

function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  // stella a 5 punte (unit, punta in alto), scalata e traslata
  const d =
    'M0,-5 L1.18,-1.62 L4.76,-1.55 L1.9,0.62 L2.94,4.05 L0,2 L-2.94,4.05 L-1.9,0.62 L-4.76,-1.55 L-1.18,-1.62 Z'
  return <path d={d} fill={fill} transform={`translate(${cx} ${cy}) scale(${r / 5})`} />
}

const FLAGS: Record<string, ReactNode> = {
  IT: (
    <>
      <rect width={20} height={15} fill="#f1f2f1" />
      <rect width={6.67} height={15} fill="#008c45" />
      <rect x={13.33} width={6.67} height={15} fill="#cd212a" />
    </>
  ),
  FR: (
    <>
      <rect width={20} height={15} fill="#fff" />
      <rect width={6.67} height={15} fill="#0055a4" />
      <rect x={13.33} width={6.67} height={15} fill="#ef4135" />
    </>
  ),
  ES: (
    <>
      <rect width={20} height={15} fill="#aa151b" />
      <rect y={3.75} width={20} height={7.5} fill="#f1bf00" />
    </>
  ),
  DE: (
    <>
      <rect width={20} height={5} fill="#000" />
      <rect y={5} width={20} height={5} fill="#dd0000" />
      <rect y={10} width={20} height={5} fill="#ffce00" />
    </>
  ),
  PT: (
    <>
      <rect width={20} height={15} fill="#da291c" />
      <rect width={8} height={15} fill="#046a38" />
      <circle cx={8} cy={7.5} r={2.3} fill="none" stroke="#ffe000" strokeWidth={1} />
    </>
  ),
  CN: (
    <>
      <rect width={20} height={15} fill="#de2910" />
      <Star cx={4.5} cy={4} r={2.4} fill="#ffde00" />
      <Star cx={8.5} cy={2} r={0.9} fill="#ffde00" />
      <Star cx={9.5} cy={4.5} r={0.9} fill="#ffde00" />
    </>
  ),
  TR: (
    <>
      <rect width={20} height={15} fill="#e30a17" />
      <circle cx={8.2} cy={7.5} r={3.1} fill="#fff" />
      <circle cx={9.3} cy={7.5} r={2.4} fill="#e30a17" />
      <Star cx={12.4} cy={7.5} r={1.5} fill="#fff" />
    </>
  ),
  PK: (
    <>
      <rect width={20} height={15} fill="#01411c" />
      <rect width={5} height={15} fill="#fff" />
      <circle cx={12} cy={7.5} r={3} fill="#fff" />
      <circle cx={13.1} cy={7.5} r={2.4} fill="#01411c" />
      <Star cx={15} cy={6.4} r={1.3} fill="#fff" />
    </>
  ),
  IN: (
    <>
      <rect width={20} height={5} fill="#ff9933" />
      <rect y={5} width={20} height={5} fill="#fff" />
      <rect y={10} width={20} height={5} fill="#138808" />
      <circle cx={10} cy={7.5} r={1.7} fill="none" stroke="#000080" strokeWidth={0.7} />
    </>
  ),
  BD: (
    <>
      <rect width={20} height={15} fill="#006a4e" />
      <circle cx={8.8} cy={7.5} r={3.2} fill="#f42a41" />
    </>
  ),
  VN: (
    <>
      <rect width={20} height={15} fill="#da251d" />
      <Star cx={10} cy={7.5} r={3.6} fill="#ff0" />
    </>
  ),
}

export default function CountryFlag({ cc, size = 18 }: { cc: string; size?: number }) {
  const flag = FLAGS[cc.toUpperCase()]
  if (!flag) {
    return <span className="cflag-dot" title={cc} aria-hidden />
  }
  return (
    <svg
      className="cflag"
      width={size}
      height={size * 0.75}
      viewBox="0 0 20 15"
      role="img"
      aria-label={cc}
    >
      <defs>
        <clipPath id={`cf-${cc}`}>
          <rect width={20} height={15} rx={2.5} />
        </clipPath>
      </defs>
      <g clipPath={`url(#cf-${cc})`}>{flag}</g>
      <rect width={20} height={15} rx={2.5} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth={1} />
    </svg>
  )
}
