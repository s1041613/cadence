export const pad = (n: number): string => String(n).padStart(2, '0')

export const iso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Always parse "YYYY-MM-DD" through this — never `new Date(string)`, which parses as UTC and can land on the wrong local day.
export const parseISO = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const WD_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
export const WD_CAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WD_SHORT = ['日', '一', '二', '三', '四', '五', '六']

// Monday start
export const startOfWeek = (d: Date): Date => {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  return addDays(x, -day)
}

export const minutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number) as [number, number]
  return h * 60 + m
}

export const toHM = (mins: number): string => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`

export const fmtDur = (m: number): string => (m >= 60 ? `${(m / 60).toFixed(m % 60 ? 1 : 0)} hr` : `${m} min`)

// Pomodoro count derived from slot length: 1 = 25 min, rounded up (all-day = 1).
const POM_MIN = 25

export const autoPoms = (t: { allDay: boolean; start: string; end: string }): number => {
  if (t.allDay || !t.start || !t.end) return 1
  const dur = minutes(t.end) - minutes(t.start)
  return Math.max(1, Math.ceil(dur / POM_MIN))
}
