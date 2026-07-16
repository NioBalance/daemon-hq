export type FieldValue = string | number

export interface FieldDef {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'select' | 'number' | 'date'
  options?: { value: string; label: string }[]
  half?: boolean
  placeholder?: string
  min?: number
  max?: number
}

export type FormValues = Record<string, FieldValue>

// Raggruppa i campi consecutivi con half:true in coppie (renderizzate come
// .fieldrow a 2 colonne); un half spaiato o un campo non-half occupano
// una riga intera — stessa logica di raggruppamento del prototipo originale.
function groupFields(fields: FieldDef[]): (FieldDef | [FieldDef, FieldDef])[] {
  const groups: (FieldDef | [FieldDef, FieldDef])[] = []
  let buf: FieldDef[] = []
  const flush = () => {
    if (buf.length === 2) groups.push([buf[0], buf[1]])
    else if (buf.length === 1) groups.push(buf[0])
    buf = []
  }
  for (const f of fields) {
    if (f.half) {
      buf.push(f)
      if (buf.length === 2) flush()
    } else {
      flush()
      groups.push(f)
    }
  }
  flush()
  return groups
}

export default function FormFields({
  fields,
  values,
  onChange,
}: {
  fields: FieldDef[]
  values: FormValues
  onChange: (key: string, value: FieldValue) => void
}) {
  const groups = groupFields(fields)
  return (
    <>
      {groups.map((g) =>
        Array.isArray(g) ? (
          <div className="fieldrow" key={g[0].key + g[1].key}>
            <FieldInput field={g[0]} value={values[g[0].key]} onChange={onChange} />
            <FieldInput field={g[1]} value={values[g[1].key]} onChange={onChange} />
          </div>
        ) : (
          <FieldInput key={g.key} field={g} value={values[g.key]} onChange={onChange} />
        ),
      )}
    </>
  )
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: FieldValue | undefined
  onChange: (key: string, value: FieldValue) => void
}) {
  const v = value ?? ''

  if (field.type === 'textarea') {
    return (
      <div className="field">
        <label>{field.label}</label>
        <textarea
          value={String(v)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div className="field">
        <label>{field.label}</label>
        <select value={String(v)} onChange={(e) => onChange(field.key, e.target.value)}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="field">
      <label>{field.label}</label>
      <input
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={v}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
        onChange={(e) => onChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
      />
    </div>
  )
}
