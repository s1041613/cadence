<template>
  <button
    type="button"
    class="provider-btn"
    :class="`provider-btn--${provider}`"
    :disabled="disabled"
    @click="emit('select')"
  >
    <span class="provider-btn__icon" aria-hidden="true">
      <!-- Google "G" — the official four-colour mark, unmodified per brand guidelines. -->
      <svg v-if="provider === 'google'" width="22" height="22" viewBox="0 0 18 18">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z" />
        <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z" />
      </svg>
      <!-- Apple logo — monochrome and unmodified per the Sign in with Apple guidelines; it
           takes the page's ink so it reads as one family with the label beside it. -->
      <svg v-else width="19" height="22" viewBox="0 0 17 20" fill="currentColor">
        <path d="M14.06 15.53c-.28.64-.6 1.23-.98 1.78-.52.73-.94 1.24-1.27 1.52-.5.46-1.05.7-1.63.71-.42 0-.92-.12-1.5-.36-.58-.24-1.12-.36-1.6-.36-.5 0-1.05.12-1.66.36-.6.24-1.1.37-1.46.38-.56.02-1.12-.22-1.68-.73-.36-.3-.8-.82-1.32-1.57-.56-.8-1.02-1.72-1.38-2.78C.7 13.57.5 12.5.5 11.46c0-1.2.26-2.23.78-3.1a4.6 4.6 0 0 1 1.63-1.65 4.4 4.4 0 0 1 2.2-.62c.44 0 1.02.14 1.75.4.72.27 1.19.4 1.4.4.15 0 .67-.16 1.55-.47.83-.29 1.53-.41 2.1-.36 1.55.13 2.72.74 3.5 1.84-1.39.84-2.07 2.02-2.06 3.53.01 1.18.44 2.16 1.28 2.94.38.36.8.64 1.28.84-.1.3-.21.59-.33.87zM11.2.4c0 .9-.33 1.74-.98 2.51-.79.92-1.74 1.45-2.77 1.37a2.8 2.8 0 0 1-.02-.34c0-.86.38-1.78 1.05-2.53.33-.38.76-.7 1.28-.95.52-.25 1.01-.39 1.47-.41.01.12.02.24.02.35z" />
      </svg>
    </span>
    <span class="provider-btn__label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
/*
 * One component for both providers rather than the two spec §8 sketches, because the thing
 * the acceptance list actually asks for — "Google 與 Apple 按鈕尺寸完全一致" — is a property
 * of a shared box, and two components mean two copies of the geometry that can drift apart
 * silently. The provider only picks a surface and a mark.
 */
withDefaults(
  defineProps<{
    provider: 'google' | 'apple'
    label: string
    disabled?: boolean
  }>(),
  { disabled: false }
)

const emit = defineEmits<{ select: [] }>()
</script>

<style scoped>
.provider-btn {
  position: relative;
  width: 100%;
  height: 64px;
  border-radius: 32px;
  border: 1px solid transparent;
  /* The label centres on the BUTTON, not on the space left over beside the icon — which is
     why the icon is taken out of flow below rather than being a flex sibling. */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  font: 600 17px var(--cd-font-ui);
  cursor: pointer;
  transition:
    background var(--cd-duration-micro-3) var(--cd-ease-standard),
    transform var(--cd-duration-micro-1) var(--cd-ease-standard);
}

.provider-btn:active:not(:disabled) {
  transform: scale(0.985);
}

.provider-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.provider-btn__icon {
  position: absolute;
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.provider-btn__label {
  /* Clears the icon's column on both sides so a long label truncates symmetrically instead
     of sliding under the mark. */
  max-width: calc(100% - 64px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.provider-btn--google {
  background: var(--login-surface-google);
  border-color: var(--login-hairline);
  color: var(--login-ink);
}

.provider-btn--google:hover:not(:disabled) {
  background: var(--login-surface-google-hover);
}

.provider-btn--apple {
  background: var(--login-surface-apple);
  border-color: var(--login-hairline);
  color: var(--login-ink);
}

.provider-btn--apple:hover:not(:disabled) {
  background: var(--login-surface-apple-hover);
}

@media (prefers-reduced-motion: reduce) {
  .provider-btn {
    transition: none;
  }

  .provider-btn:active:not(:disabled) {
    transform: none;
  }
}
</style>
