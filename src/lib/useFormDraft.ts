import { useCallback, useEffect, useRef } from 'react'
import { useToast } from './useToast'
import type { FormValues } from '../components/FormFields'

const PREFIX = 'daemon:draft:'
const DEBOUNCE_MS = 500

/** Rete di sicurezza per i form dei modal: mentre il form è aperto salva una
 *  bozza in sessionStorage a ogni digitazione (debounce); alla riapertura, se
 *  esiste una bozza diversa dai valori iniziali, la ripristina con un toast
 *  "Bozza recuperata" e un'azione per scartarla. Con modifiche non salvate
 *  attiva anche il beforeunload (conferma su chiusura tab/refresh).
 *
 *  La bozza si pulisce SOLO a salvataggio riuscito (chiamare clear()) o con
 *  lo scarto esplicito — chiudere/annullare il modal la conserva: è proprio
 *  il caso da cui protegge.
 */
export function useFormDraft(
  draftKey: string,
  active: boolean,
  values: FormValues,
  setValues: (v: FormValues) => void,
) {
  const showToast = useToast()
  const storageKey = PREFIX + draftKey
  const initialRef = useRef('')
  const valuesRef = useRef(values)
  useEffect(() => {
    valuesRef.current = values
  })

  const clear = useCallback(() => {
    sessionStorage.removeItem(storageKey)
  }, [storageKey])

  // Apertura: cattura i valori iniziali e ripristina l'eventuale bozza.
  useEffect(() => {
    if (!active) return
    initialRef.current = JSON.stringify(valuesRef.current)
    const raw = sessionStorage.getItem(storageKey)
    if (!raw || raw === initialRef.current) return
    let draft: FormValues
    try {
      draft = JSON.parse(raw) as FormValues
    } catch {
      sessionStorage.removeItem(storageKey)
      return
    }
    const before = valuesRef.current
    // Fuori dal corpo dell'effect (niente setState sincrono in effect) e
    // dopo il commit corrente, così non litiga con l'inizializzazione.
    queueMicrotask(() => {
      setValues(draft)
      showToast('info', 'Bozza recuperata.', {
        label: 'Scarta',
        onClick: () => {
          sessionStorage.removeItem(storageKey)
          setValues(before)
        },
      })
    })
  }, [active, storageKey, setValues, showToast])

  // Digitazione: persisti la bozza con debounce, solo se diversa dagli iniziali.
  useEffect(() => {
    if (!active) return
    const json = JSON.stringify(values)
    if (json === initialRef.current) return
    const t = window.setTimeout(() => sessionStorage.setItem(storageKey, json), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [values, active, storageKey])

  // Chiusura tab/refresh con modifiche non salvate: chiedi conferma.
  useEffect(() => {
    if (!active) return
    const handler = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(valuesRef.current) !== initialRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [active])

  return { clear }
}
