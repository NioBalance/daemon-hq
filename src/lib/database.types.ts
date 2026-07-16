import type { Owner } from './tabs'

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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
