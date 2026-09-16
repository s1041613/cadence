<template>
  <section class="login-panel">
    <ProviderButton
      provider="google"
      label="Sign in with Google"
      :disabled="auth.isLoading || !auth.isConfigured"
      @select="signInWithGoogle"
    />
    <ProviderButton provider="apple" label="Sign in with Apple" @select="signInWithApple" />

    <p v-if="auth.error" class="login-panel__error" role="alert">{{ auth.error }}</p>

    <p class="login-panel__footer">Your handwritten week</p>
  </section>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth-store'
import ProviderButton from './ProviderButton.vue'

const auth = useAuthStore()

async function signInWithGoogle(): Promise<void> {
  await auth.signInWithGoogle()
}

function signInWithApple(): void {
  auth.error = 'Apple 登入尚未開啟。'
}
</script>

<style scoped>
/*
 * The panel grows to the bottom of the frame while the hero shrinks, so the buttons keep
 * their full box on a short screen. flex-basis is auto — its content height is the floor.
 */
.login-panel {
  position: relative;
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 64px 32px calc(env(safe-area-inset-bottom, 0px) + 32px);
  border-radius: 44px 44px 0 0;
  background: var(--login-surface-panel);
  /* Translucent over the decorative wash rather than opaque: the frost is what separates the
     panel from the page, since the two surfaces are within a shade of each other. */
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  /* Level 1 — flat. The hairline does the separating; nothing here floats over the page. */
  box-shadow: inset 0 1px 0 var(--login-hairline);
}

.login-panel__error {
  margin: 0;
  font: 400 13px var(--cd-font-ui);
  color: var(--login-danger);
  text-align: center;
}

.login-panel__footer {
  /* margin-top:auto rather than a fixed offset — the panel's height varies with the screen,
     and a fixed one would either float mid-panel or fall under the home indicator (spec §7). */
  margin: auto 0 0;
  padding-top: 24px;
  font: 500 10px var(--cd-font-ui);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-align: center;
  color: var(--login-ink-muted);
}
</style>
