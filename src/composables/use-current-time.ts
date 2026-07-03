import { ref } from 'vue'

// Module-level singleton: every consumer shares one ticking clock instead of each mounting its own interval.
const currentTime = ref(new Date())
let intervalId: ReturnType<typeof setInterval> | null = null

export function useCurrentTime() {
  if (intervalId === null) {
    intervalId = setInterval(() => {
      currentTime.value = new Date()
    }, 1000)
  }
  return currentTime
}
