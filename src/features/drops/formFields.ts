import type { FieldDef, FormValues } from '../../components/FormFields'
import { OWNER_OPTS } from '../../lib/tabs'

export const dropFields = (forEdit: boolean): FieldDef[] => [
  { key: 'nome', label: 'Nome drop (es. Drop VI — Inverno)' },
  { key: 'data_lancio', label: 'Data lancio', type: 'date', half: true },
  {
    key: 'owner',
    label: 'Owner',
    type: 'select',
    half: true,
    options: OWNER_OPTS.map((o) => ({ value: o.v, label: o.l })),
  },
  ...(forEdit
    ? []
    : ([
        {
          key: 'template',
          label: 'Fasi iniziali',
          type: 'select',
          options: [
            { value: 'si', label: 'Pipeline 30 giorni (7 fasi + payout 30/70)' },
            { value: 'no', label: 'Vuoto — le aggiungo io' },
          ],
        },
      ] as FieldDef[])),
  { key: 'note', label: 'Note strategiche', type: 'textarea' },
]

export const DROP_EMPTY_VALUES: FormValues = {
  nome: '',
  data_lancio: '',
  owner: 'logistica',
  template: 'si',
  note: '',
}

export const faseFields: FieldDef[] = [
  { key: 'nome', label: 'Nome fase' },
  { key: 'data', label: 'Data target', type: 'date' },
]
