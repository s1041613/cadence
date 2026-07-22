export interface Calendar {
  id: string
  name: string
  color: string
  icon: string | null
  cover: string | null
  order: number
  // Derived from the current user's calendar_members row for this calendar. Owners can delete
  // the calendar (subject to the default-calendar guard); members cannot.
  role: 'owner' | 'member'
}

export interface CalendarMember {
  id: string
  name: string
  avatarUrl: string | null
  role: 'owner' | 'member'
}
