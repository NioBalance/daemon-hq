import type { Owner } from './tabs'

export type FornitoreRuolo = 'core' | 'capsule' | 'backup'
export type FornitoreStato = 'da-contattare' | 'vetting' | 'attivo' | 'scartato'
export type DesignFase = 'idea' | 'sketch' | 'techpack' | 'campione' | 'approvato'
export type TechpackStato = 'bozza' | 'inviato' | 'confermato' | 'in-produzione'
export type SampleVerdetto = 'in-review' | 'approvato' | 'revisione' | 'scartato'
export type ChatCanale = 'wa' | 'ig' | 'email'
export type ChatStato = 'aperta' | 'in-attesa' | 'chiusa'
export type MediaTipo = 'foto' | 'video' | 'logo'
export type MediaTag =
  | 'indossati'
  | 'bg-removed'
  | 'mobile'
  | 'pc'
  | 'loghi'
  | 'shooting-archivio'
  | 'adv-pronte'
  | 'adv-idee'
  | 'removed-bg'
  | 'in-edit'
  | 'stories'
  | 'post'
  | 'bozze'
  | 'reel'
export type EventTipo = 'meeting' | 'deadline' | 'lancio'
export type NoteEntityType =
  | 'articoli'
  | 'gadgets'
  | 'inspo'
  | 'media'
  | 'chats'
  | 'techpacks'
  | 'drops'
  | 'samples'
  | 'fornitori'
export type MemoColore = 'decisione' | 'idea' | 'urgente'
export type TechpackFileTipo = 'img' | 'pdf' | 'link' | 'file'
export type MeetingStato = 'pianificata' | 'conclusa'
export type MeetingPiattaforma = 'meet' | 'zoom' | 'teams' | 'altro'
export type PublishTipo = 'post' | 'reel' | 'story'
export type PublishFase = 'idea' | 'in-edit' | 'pronto' | 'programmato' | 'pubblicato'
export type KpiMetrica =
  | 'instagram_followers'
  | 'ordini_totali'
  | 'pacchi_drop'
  | 'waitlist'
  | 'revenue_drop'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nome: string
          ruolo: Owner | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nome?: string
          ruolo?: Owner | null
          email?: string | null
        }
        Update: {
          nome?: string
          ruolo?: Owner | null
          email?: string | null
        }
        Relationships: []
      }

      fornitori: {
        Row: {
          id: string
          nome: string
          luogo: string | null
          ruolo: FornitoreRuolo | null
          contatto: string | null
          lead_time: string | null
          materiali: string | null
          stato: FornitoreStato
          note: string | null
          logo_path: string | null
          telefono: string | null
          chat_url: string | null
          main_products: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          luogo?: string | null
          ruolo?: FornitoreRuolo | null
          contatto?: string | null
          lead_time?: string | null
          materiali?: string | null
          stato?: FornitoreStato
          note?: string | null
          logo_path?: string | null
          telefono?: string | null
          chat_url?: string | null
          main_products?: string | null
        }
        Update: Partial<Database['public']['Tables']['fornitori']['Insert']>
        Relationships: []
      }

      drops: {
        Row: {
          id: string
          nome: string
          data_lancio: string | null
          owner: Owner | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          data_lancio?: string | null
          owner?: Owner | null
          note?: string | null
        }
        Update: Partial<Database['public']['Tables']['drops']['Insert']>
        Relationships: []
      }

      drop_fasi: {
        Row: {
          id: string
          drop_id: string
          nome: string
          data: string | null
          done: boolean
          ordine: number
        }
        Insert: {
          id?: string
          drop_id: string
          nome: string
          data?: string | null
          done?: boolean
          ordine?: number
        }
        Update: Partial<Database['public']['Tables']['drop_fasi']['Insert']>
        Relationships: []
      }

      articoli: {
        Row: {
          id: string
          nome: string
          categoria: string | null
          colori: string | null
          drop_id: string | null
          img_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          categoria?: string | null
          colori?: string | null
          drop_id?: string | null
          img_path?: string | null
        }
        Update: Partial<Database['public']['Tables']['articoli']['Insert']>
        Relationships: []
      }

      articolo_tasks: {
        Row: {
          id: string
          articolo_id: string
          testo: string
          done: boolean
          ordine: number
        }
        Insert: {
          id?: string
          articolo_id: string
          testo: string
          done?: boolean
          ordine?: number
        }
        Update: Partial<Database['public']['Tables']['articolo_tasks']['Insert']>
        Relationships: []
      }

      designs: {
        Row: {
          id: string
          nome: string
          categoria: string | null
          fase: DesignFase
          owner: Owner | null
          note: string | null
          ordine: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          categoria?: string | null
          fase?: DesignFase
          owner?: Owner | null
          note?: string | null
          ordine?: number
        }
        Update: Partial<Database['public']['Tables']['designs']['Insert']>
        Relationships: []
      }

      techpacks: {
        Row: {
          id: string
          nome: string
          categoria: string | null
          colorway: string | null
          materiali: string | null
          taglie: string | null
          fornitore_id: string | null
          articolo_id: string | null
          stato: TechpackStato
          owner: Owner | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          categoria?: string | null
          colorway?: string | null
          materiali?: string | null
          taglie?: string | null
          fornitore_id?: string | null
          articolo_id?: string | null
          stato?: TechpackStato
          owner?: Owner | null
          note?: string | null
        }
        Update: Partial<Database['public']['Tables']['techpacks']['Insert']>
        Relationships: []
      }

      samples: {
        Row: {
          id: string
          nome: string
          fornitore_id: string | null
          techpack_id: string | null
          data_arrivo: string | null
          fit: number | null
          tessuto: number | null
          cuciture: number | null
          colore: number | null
          verdetto: SampleVerdetto
          owner: Owner | null
          note: string | null
          img_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          fornitore_id?: string | null
          techpack_id?: string | null
          data_arrivo?: string | null
          fit?: number | null
          tessuto?: number | null
          cuciture?: number | null
          colore?: number | null
          verdetto?: SampleVerdetto
          owner?: Owner | null
          note?: string | null
          img_path?: string | null
        }
        Update: Partial<Database['public']['Tables']['samples']['Insert']>
        Relationships: []
      }

      gadgets: {
        Row: {
          id: string
          nome: string
          img_path: string | null
          ordine: number
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          img_path?: string | null
          ordine?: number
        }
        Update: Partial<Database['public']['Tables']['gadgets']['Insert']>
        Relationships: []
      }

      inspo: {
        Row: {
          id: string
          titolo: string
          img_path: string | null
          ordine: number
          created_at: string
        }
        Insert: {
          id?: string
          titolo: string
          img_path?: string | null
          ordine?: number
        }
        Update: Partial<Database['public']['Tables']['inspo']['Insert']>
        Relationships: []
      }

      links: {
        Row: {
          id: string
          label: string
          url: string | null
          ordine: number
          created_at: string
        }
        Insert: {
          id?: string
          label: string
          url?: string | null
          ordine?: number
        }
        Update: Partial<Database['public']['Tables']['links']['Insert']>
        Relationships: []
      }

      ai_links: {
        Row: {
          id: string
          label: string
          url: string | null
        }
        Insert: {
          id?: string
          label: string
          url?: string | null
        }
        Update: Partial<Database['public']['Tables']['ai_links']['Insert']>
        Relationships: []
      }

      chat_channels: {
        Row: {
          id: string
          label: string
          url: string | null
        }
        Insert: {
          id?: string
          label: string
          url?: string | null
        }
        Update: Partial<Database['public']['Tables']['chat_channels']['Insert']>
        Relationships: []
      }

      chats: {
        Row: {
          id: string
          cliente: string
          canale: ChatCanale
          stato: ChatStato
          owner: Owner | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cliente: string
          canale?: ChatCanale
          stato?: ChatStato
          owner?: Owner | null
        }
        Update: Partial<Database['public']['Tables']['chats']['Insert']>
        Relationships: []
      }

      media: {
        Row: {
          id: string
          titolo: string
          tipo: MediaTipo
          url: string | null
          img_path: string | null
          obiettivo: string | null
          ordine: number
          created_at: string
        }
        Insert: {
          id?: string
          titolo: string
          tipo?: MediaTipo
          url?: string | null
          img_path?: string | null
          obiettivo?: string | null
          ordine?: number
        }
        Update: Partial<Database['public']['Tables']['media']['Insert']>
        Relationships: []
      }

      media_tags: {
        Row: {
          id: string
          media_id: string
          tag: MediaTag
          created_at: string
        }
        Insert: {
          id?: string
          media_id: string
          tag: MediaTag
        }
        Update: Partial<Database['public']['Tables']['media_tags']['Insert']>
        Relationships: []
      }

      team_memos: {
        Row: {
          id: string
          author_id: string | null
          author_name: string
          testo: string
          pin: boolean
          colore: MemoColore | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id?: string | null
          author_name: string
          testo: string
          pin?: boolean
          colore?: MemoColore | null
        }
        Update: Partial<Database['public']['Tables']['team_memos']['Insert']>
        Relationships: []
      }

      techpack_files: {
        Row: {
          id: string
          techpack_id: string
          nome: string
          tipo: TechpackFileTipo
          path: string | null
          url: string | null
          percorso: string
          created_at: string
        }
        Insert: {
          id?: string
          techpack_id: string
          nome: string
          tipo: TechpackFileTipo
          path?: string | null
          url?: string | null
          percorso?: string
        }
        Update: Partial<Database['public']['Tables']['techpack_files']['Insert']>
        Relationships: []
      }

      activity: {
        Row: {
          id: string
          author_id: string | null
          author_name: string
          azione: string
          oggetto: string
          tab: string | null
          created_at: string
        }
        Insert: {
          id?: string
          author_id?: string | null
          author_name: string
          azione: string
          oggetto: string
          tab?: string | null
        }
        Update: Partial<Database['public']['Tables']['activity']['Insert']>
        Relationships: []
      }

      kpi_snapshots: {
        Row: {
          id: string
          metrica: KpiMetrica
          valore: number
          data: string
          inserito_da: string
          created_at: string
        }
        Insert: {
          id?: string
          metrica: KpiMetrica
          valore: number
          data?: string
          inserito_da: string
        }
        Update: Partial<Database['public']['Tables']['kpi_snapshots']['Insert']>
        Relationships: []
      }

      events: {
        Row: {
          id: string
          titolo: string
          data: string
          tipo: EventTipo
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          titolo: string
          data: string
          tipo?: EventTipo
          note?: string | null
        }
        Update: Partial<Database['public']['Tables']['events']['Insert']>
        Relationships: []
      }

      notes: {
        Row: {
          id: string
          entity_type: NoteEntityType
          entity_id: string
          author_id: string | null
          author_name: string
          testo: string
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: NoteEntityType
          entity_id: string
          author_id?: string | null
          author_name: string
          testo: string
        }
        Update: Partial<Database['public']['Tables']['notes']['Insert']>
        Relationships: []
      }

      meetings: {
        Row: {
          id: string
          titolo: string
          data: string | null
          partecipanti: string | null
          note: string | null
          stato: MeetingStato
          link_riunione: string | null
          piattaforma: MeetingPiattaforma | null
          author_id: string | null
          author_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          titolo: string
          data?: string | null
          partecipanti?: string | null
          note?: string | null
          stato?: MeetingStato
          link_riunione?: string | null
          piattaforma?: MeetingPiattaforma | null
          author_id?: string | null
          author_name?: string
        }
        Update: Partial<Database['public']['Tables']['meetings']['Insert']>
        Relationships: []
      }

      meeting_actions: {
        Row: {
          id: string
          meeting_id: string
          testo: string
          assegnatario: string | null
          scadenza: string | null
          done: boolean
          ordine: number
          created_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          testo: string
          assegnatario?: string | null
          scadenza?: string | null
          done?: boolean
          ordine?: number
        }
        Update: Partial<Database['public']['Tables']['meeting_actions']['Insert']>
        Relationships: []
      }

      publish_items: {
        Row: {
          id: string
          titolo: string
          tipo: PublishTipo
          canale: string | null
          fase: PublishFase
          data_programmata: string | null
          media_id: string | null
          owner: Owner | null
          note: string | null
          ordine: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          titolo: string
          tipo?: PublishTipo
          canale?: string | null
          fase?: PublishFase
          data_programmata?: string | null
          media_id?: string | null
          owner?: Owner | null
          note?: string | null
          ordine?: number
        }
        Update: Partial<Database['public']['Tables']['publish_items']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
