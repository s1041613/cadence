import { defineStore } from 'pinia'
import { ref } from 'vue'

export type TimeFormat = '24-Hour'
export type FirstDay = 'Sunday' | 'Monday' | 'Saturday'
export type MonthEventLabel = 'name' | 'icon' | 'time' | 'dot'

// Index 0 = January … 11 = December. `null` means "no user upload for this month" — the
// system default in public/month-photos/ is used instead (see MonthView's monthPhotoSrc).
export type MonthlyPhotos = (string | null)[]

export function defaultMonthlyPhotos(): MonthlyPhotos {
  return Array.from({ length: 12 }, () => null)
}

export const useSettingsStore = defineStore('settings', () => {
  const timeFormat = ref<TimeFormat>('24-Hour')
  const firstDay = ref<FirstDay>('Sunday')
  const monthEventLabel = ref<MonthEventLabel>('name')
  const showPhoto = ref(true)
  const monthlyPhotos = ref<MonthlyPhotos>(defaultMonthlyPhotos())

  return { timeFormat, firstDay, monthEventLabel, showPhoto, monthlyPhotos }
})
