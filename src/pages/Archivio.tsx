import { useCallback, useMemo, useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { ErrorState, SkeletonGrid } from '../components/QueryState'
import EmptyState from '../components/EmptyState'
import FolderCard from '../components/FolderCard'
import LinkCard from '../components/LinkCard'
import { useInspo, useCreateInspo, useUpdateInspo, useDeleteInspo, type Inspo } from '../features/inspo/queries'
import { useLinks, useCreateLink, useUpdateLink, useDeleteLink, type BrandLink } from '../features/links/queries'
import { useToast } from '../lib/useToast'
import { useConfirmDelete } from '../lib/confirm-context'
import { useFormDraft } from '../lib/useFormDraft'
import { useNav, useRegisterNewAction } from '../lib/navigation'

// I gadget non vivono più qui (§5.1): sono una riga orizzontale dentro
// Campioni e Catalogo (components/GadgetRow).

const TITLE_FIELDS: FieldDef[] = [{ key: 'value', label: 'Titolo / idea prodotto' }]
const LINK_FIELDS: FieldDef[] = [
  { key: 'label', label: 'Nome (es. Google Drive — DÆMON)' },
  { key: 'url', label: 'URL completo (https://…)' },
]

export default function Archivio() {
  const showToast = useToast()
  const confirmDelete = useConfirmDelete()
  const { archTab, setArchTab } = useNav()

  const inspo = useInspo()
  const createInspo = useCreateInspo()
  const updateInspo = useUpdateInspo()
  const deleteInspo = useDeleteInspo()

  const links = useLinks()
  const createLink = useCreateLink()
  const updateLink = useUpdateLink()
  const deleteLink = useDeleteLink()

  const [titleModal, setTitleModal] = useState<{ id: string | null } | null>(null)
  const [titleValue, setTitleValue] = useState('')
  const [titleError, setTitleError] = useState<string | null>(null)

  const [linkModal, setLinkModal] = useState<'none' | 'create' | 'edit'>('none')
  const [editingLink, setEditingLink] = useState<BrandLink | null>(null)
  const [linkValues, setLinkValues] = useState<FormValues>({ label: '', url: '' })
  const [linkError, setLinkError] = useState<string | null>(null)

  // Il modal titolo usa una stringa singola: wrapper stabili per adattarla
  // alla forma FormValues richiesta dal sistema bozze.
  const titleDraftValues = useMemo(() => ({ value: titleValue }), [titleValue])
  const setTitleDraftValues = useCallback((v: FormValues) => setTitleValue(String(v.value ?? '')), [])
  const titleDraft = useFormDraft(
    `archivio-inspo:${titleModal?.id ?? 'new'}`,
    titleModal !== null,
    titleDraftValues,
    setTitleDraftValues,
  )
  const linkDraft = useFormDraft(
    `brand-link:${editingLink?.id ?? 'new'}`,
    linkModal !== 'none',
    linkValues,
    setLinkValues,
  )

  useRegisterNewAction(() => (archTab === 'inspo' ? openAddInspo() : openCreateLink()))

  function openAddInspo() {
    setTitleValue('')
    setTitleError(null)
    setTitleModal({ id: null })
  }
  function openEditInspo(i: Inspo) {
    setTitleValue(i.titolo)
    setTitleError(null)
    setTitleModal({ id: i.id })
  }

  async function handleTitleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = titleValue.trim()
    if (!trimmed || !titleModal) {
      setTitleError('Inserisci un titolo.')
      return
    }
    try {
      if (titleModal.id) {
        await updateInspo.mutateAsync({ id: titleModal.id, patch: { titolo: trimmed } })
        showToast('success', 'Inspirazione aggiornata.')
      } else {
        await createInspo.mutateAsync({ titolo: trimmed, ordine: inspo.data?.length ?? 0 })
        showToast('success', 'Inspirazione creata.')
      }
      titleDraft.clear()
      setTitleModal(null)
    } catch (err) {
      setTitleError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  function openCreateLink() {
    setLinkValues({ label: '', url: '' })
    setLinkError(null)
    setEditingLink(null)
    setLinkModal('create')
  }
  function openEditLink(l: BrandLink) {
    setLinkValues({ label: l.label, url: l.url ?? '' })
    setLinkError(null)
    setEditingLink(l)
    setLinkModal('edit')
  }

  async function handleLinkSubmit(e: FormEvent) {
    e.preventDefault()
    const label = String(linkValues.label ?? '').trim()
    if (!label) {
      setLinkError('Inserisci un nome.')
      return
    }
    const patch = { label, url: String(linkValues.url ?? '').trim() || null }
    try {
      if (linkModal === 'edit' && editingLink) {
        await updateLink.mutateAsync({ id: editingLink.id, patch })
        showToast('success', 'Link aggiornato.')
      } else {
        await createLink.mutateAsync({ ...patch, ordine: links.data?.length ?? 0 })
        showToast('success', 'Link creato.')
      }
      linkDraft.clear()
      setLinkModal('none')
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  function handleDeleteInspo(i: Inspo) {
    confirmDelete(`Eliminare "${i.titolo}"?`, () => deleteInspo.mutateAsync(i.id), 'Inspirazione eliminata')
  }
  function handleDeleteLink(l: BrandLink) {
    confirmDelete(`Eliminare "${l.label}"?`, () => deleteLink.mutateAsync(l.id), 'Link eliminato')
  }

  const activeQuery = archTab === 'inspo' ? inspo : links

  return (
    <>
      <PanelHead
        title="Archivio"
        actions={
          <button className="btn" onClick={archTab === 'inspo' ? openAddInspo : openCreateLink}>
            + {archTab === 'inspo' ? 'Inspirazione' : 'Link'}
          </button>
        }
      />
      <div className="subtabs">
        <button className={`chip${archTab === 'inspo' ? ' active' : ''}`} onClick={() => setArchTab('inspo')}>
          Inspirazione ({inspo.data?.length ?? 0})
        </button>
        <button className={`chip${archTab === 'links' ? ' active' : ''}`} onClick={() => setArchTab('links')}>
          Link ({links.data?.length ?? 0})
        </button>
      </div>

      {activeQuery.isLoading && <SkeletonGrid count={6} height={220} minWidth={240} />}
      {activeQuery.isError && (
        <ErrorState message={(activeQuery.error as Error).message} onRetry={() => activeQuery.refetch()} />
      )}

      {!activeQuery.isLoading && !activeQuery.isError && archTab === 'inspo' && (
        <>
          <div className="panel-desc" style={{ marginBottom: 14 }}>
            Screenshot e idee prodotto da tenere d'occhio. Carica lo screen, annota chi l'ha proposto e perché. I
            gadget vivono ora dentro Campioni e Catalogo.
          </div>
          <div className="folder-grid">
            {(inspo.data ?? []).map((i) => (
              <FolderCard
                key={i.id}
                id={i.id}
                title={i.titolo}
                imgPath={i.img_path}
                entityType="inspo"
                onEditTitle={() => openEditInspo(i)}
                onDelete={() => handleDeleteInspo(i)}
                onImageUploaded={(path) => updateInspo.mutate({ id: i.id, patch: { img_path: path } })}
              />
            ))}
          </div>
          {(inspo.data ?? []).length === 0 && <EmptyState icon="star" text="Nessuna inspirazione salvata." ctaLabel="+ Inspirazione" onCta={openAddInspo} />}
        </>
      )}

      {!activeQuery.isLoading && !activeQuery.isError && archTab === 'links' && (
        <>
          <div className="panel-desc" style={{ marginBottom: 14 }}>
            Collegamenti rapidi del brand. Modifica gli URL una volta e restano per tutto il team.
          </div>
          {(links.data ?? []).map((l) => (
            <LinkCard key={l.id} label={l.label} url={l.url} onEdit={() => openEditLink(l)} onDelete={() => handleDeleteLink(l)} />
          ))}
        </>
      )}

      {titleModal && (
        <Modal title={titleModal.id ? 'Modifica' : 'Nuova inspirazione'} onClose={() => setTitleModal(null)}>
          <form onSubmit={handleTitleSubmit}>
            <FormFields
              fields={TITLE_FIELDS}
              values={{ value: titleValue }}
              onChange={(_k, v) => setTitleValue(String(v))}
            />
            {titleError && <p className="auth-msg err">{titleError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setTitleModal(null)}>
                Annulla
              </button>
              <button className="btn" type="submit">
                Salva
              </button>
            </div>
          </form>
        </Modal>
      )}

      {linkModal !== 'none' && (
        <Modal title={linkModal === 'edit' ? 'Modifica link' : 'Nuovo link'} onClose={() => setLinkModal('none')}>
          <form onSubmit={handleLinkSubmit}>
            <FormFields
              fields={LINK_FIELDS}
              values={linkValues}
              onChange={(k, v) => setLinkValues((s) => ({ ...s, [k]: v }))}
            />
            {linkError && <p className="auth-msg err">{linkError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setLinkModal('none')}>
                Annulla
              </button>
              <button className="btn" type="submit">
                Salva
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
