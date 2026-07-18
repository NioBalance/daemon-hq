import { createContext } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  variant: ToastVariant
  message: string
  action?: ToastAction
}

export interface ToastContextValue {
  toasts: ToastItem[]
  showToast: (variant: ToastVariant, message: string, action?: ToastAction) => void
  dismissToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
