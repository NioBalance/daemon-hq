import type { ButtonHTMLAttributes, ReactNode } from 'react'

/** Bottone v5 (spec §6.2). `primary` massimo uno per viewport; `semantic-tag`
 *  per le azioni di stato (Approva sample, Segna in produzione): tinte piatte,
 *  mai 4+ bottoni saturi affiancati. `destructive` a fondo pieno solo nella
 *  conferma modale (prop `solid`). */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'semantic-tag'
export type ButtonTone = 'success' | 'warning' | 'destructive' | 'info' | 'primary'
export type ButtonSize = 'sm' | 'md' | 'lg'

export default function Button({
  variant = 'secondary',
  size = 'md',
  tone = 'primary',
  solid = false,
  icon,
  className,
  children,
  ...rest
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  /** solo per variant="semantic-tag" */
  tone?: ButtonTone
  /** solo per variant="destructive": fondo pieno (conferma modale) */
  solid?: boolean
  icon?: ReactNode
  children?: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const variantClass = variant === 'semantic-tag' ? `btn2-tag tone-${tone}` : `btn2-${variant}`
  const cls = ['btn2', variantClass, `btn2-${size}`, solid ? 'solid' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return (
    <button className={cls} {...rest}>
      {icon}
      {children}
    </button>
  )
}
