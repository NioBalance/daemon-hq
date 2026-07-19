import { useState } from 'react'
import { FormFields } from 'daemon-production-hq'
import type { ReactNode } from 'react'

function Canvas({ children, width }: { children: ReactNode; width?: number }) {
  return (
    <div
      style={{
        background: 'var(--void)',
        color: 'var(--bone)',
        fontFamily: 'var(--font-b)',
        fontSize: 15,
        lineHeight: 1.5,
        padding: 20,
        borderRadius: 14,
        maxWidth: width,
      }}
    >
      {children}
    </div>
  )
}

const CAMPI_FORNITORE = [
  { key: 'nome', label: 'Nome fornitore' },
  { key: 'luogo', label: 'Luogo', half: true },
  { key: 'lead_time', label: 'Lead time', half: true },
  {
    key: 'ruolo',
    label: 'Ruolo',
    type: 'select',
    options: [
      { value: 'core', label: 'Core' },
      { value: 'capsule', label: 'Capsule' },
      { value: 'backup', label: 'Backup' },
    ],
  },
  { key: 'note', label: 'Note', type: 'textarea' },
]

export function SchedaFornitore() {
  const [values, setValues] = useState<Record<string, string | number>>({
    nome: 'Atelier Nova SRL',
    luogo: 'Prato',
    lead_time: '21 giorni',
    ruolo: 'core',
    note: 'Campioni french terry 380gsm approvati a giugno.',
  })
  return (
    <Canvas width={480}>
      <FormFields fields={CAMPI_FORNITORE} values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
    </Canvas>
  )
}

const CAMPI_EVENTO = [
  { key: 'titolo', label: 'Titolo evento' },
  { key: 'data', label: 'Data', type: 'date', half: true },
  { key: 'quota', label: 'Pezzi previsti', type: 'number', half: true, min: 0 },
]

export function TipiDiCampo() {
  const [values, setValues] = useState<Record<string, string | number>>({
    titolo: 'Drop 001 — lancio',
    data: '2026-09-12',
    quota: 250,
  })
  return (
    <Canvas width={480}>
      <FormFields fields={CAMPI_EVENTO} values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
    </Canvas>
  )
}

export function CampiVuotiConPlaceholder() {
  const [values, setValues] = useState<Record<string, string | number>>({ label: '', url: '' })
  return (
    <Canvas width={480}>
      <FormFields
        fields={[
          { key: 'label', label: 'Nome (es. Cartella misure — Drive)' },
          { key: 'url', label: 'URL completo', placeholder: 'https://…' },
        ]}
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
      />
    </Canvas>
  )
}
