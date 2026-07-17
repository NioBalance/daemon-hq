import { createContext } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  variant: ToastVariant
  message: string
}

export interface ToastContextValue {
  toasts: ToastItem[]
  showToast: (variant: ToastVariant, message: string) => void
  dismissToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
