import { ref } from 'vue'

// IME-safe Enter: double safeguard against submitting mid-composition — the compositionstart/end
// event pair (composingRef) plus the native isComposing flag, matching the prototype's behavior.
export function useImeSafeEnter() {
  const isComposing = ref(false)

  function onCompositionStart() {
    isComposing.value = true
  }

  function onCompositionEnd() {
    isComposing.value = false
  }

  function onEnterKeydown(e: KeyboardEvent, confirm: () => void) {
    if (e.key === 'Enter' && !isComposing.value && !e.isComposing) {
      e.preventDefault()
      confirm()
    }
  }

  return { isComposing, onCompositionStart, onCompositionEnd, onEnterKeydown }
}
