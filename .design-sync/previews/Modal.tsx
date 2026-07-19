import { useState } from 'react'
import { Modal, FormFields } from 'daemon-production-hq'
import type { ReactNode } from 'react'

// Il Modal è un overlay fixed: la story stende prima uno sfondo app scuro
// a tutto viewport, come la pagina reale sotto il backdrop.
function SfondoApp({ children }: { children: ReactNode }) {
  // Altezza statica: il Modal è un overlay fixed e da solo lascerebbe il
  // documento a 0px — la cattura ritaglierebbe una striscia.
  return (
    <div
      style={{
        minHeight: 520,
        background: 'var(--void)',
        color: 'var(--bone)',
        fontFamily: 'var(--font-b)',
        fontSize: 15,
      }}
    >
      {children}
    </div>
  )
}

export function ModalConForm() {
  const [values, setValues] = useState<Record<string, string | number>>({
    nome: 'Tee boxy «Wrath»',
    categoria: 'tshirt',
  })
  return (
    <SfondoApp>
      <Modal title="Nuovo articolo" onClose={() => {}}>
        <form onSubmit={(e) => e.preventDefault()}>
          <FormFields
            fields={[
              { key: 'nome', label: 'Nome articolo' },
              {
                key: 'categoria',
                label: 'Categoria',
                type: 'select',
                options: [
                  { value: 'tshirt', label: 'T-shirt' },
                  { value: 'hoodie', label: 'Hoodie' },
                ],
              },
            ]}
            values={values}
            onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
          />
          <div className="modal-actions">
            <button className="btn ghost" type="button">
              Annulla
            </button>
            <button className="btn" type="submit">
              Salva
            </button>
          </div>
        </form>
      </Modal>
    </SfondoApp>
  )
}

export function ConfermaEliminazione() {
  return (
    <SfondoApp>
      <Modal title="Conferma eliminazione" role="alertdialog" onClose={() => {}}>
        <p style={{ fontSize: 14 }}>Rimuovere "scheda-misure.pdf" dalla cartella?</p>
        <div className="modal-actions">
          <button className="btn ghost">Annulla</button>
          <button className="btn danger">Elimina</button>
        </div>
      </Modal>
    </SfondoApp>
  )
}
