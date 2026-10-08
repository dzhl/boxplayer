import type { PosterAction } from '../utils/mediaPosterMenu'
export interface UnifiedLibraryCard {
  key: string
  title: string
  sortValues?: { title: string; fileName?: string; addedAt?: string | number | Date; premiereDate?: string }
  image?: string
  subtitle?: string
  progress?: number
  posterMenu?: { server: boolean; tv: boolean; watched: boolean; favorite?: boolean; disabled: PosterAction[]; action: (action: PosterAction) => void }
  action: () => void
}

export interface UnifiedLibraryRow {
  key: string
  title: string
  cards: UnifiedLibraryCard[]
  landscape?: boolean
  more: () => void
}
