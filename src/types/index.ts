export type Role = 'admin' | 'vendedor'

export interface Project {
  id: string
  name: string
  slug: string
  invite_token: string
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  email: string
  role: Role
  active: boolean
  project_id: string | null
  created_at: string
  projects?: Project
}

export type ReceiptStatus = 'pending' | 'approved' | 'rejected'

export interface Receipt {
  id: string
  user_id: string
  project_id: string | null
  file_url: string
  file_type: string
  amount: number
  deposit_date: string
  bank: string
  notes: string
  status: ReceiptStatus
  created_at: string
  profiles?: Profile
}

export type BoardType = 'board1' | 'board2'

export interface DynamicsCard {
  id: string
  project_id: string | null
  board: BoardType
  column_id: string
  title: string
  description: string
  category: string
  attachment_url: string | null
  attachment_name: string | null
  attachment_type: string | null
  position: number
  created_by: string
  created_at: string
}

export interface WeeklyPlanner {
  id: string
  card_id: string
  project_id: string | null
  day_of_week: string
  position: number
  scheduled_date: string | null
  created_at: string
  dynamics_cards?: DynamicsCard
}

export type PeriodFilter = 'today' | '7d' | '15d' | '30d'
