<template>
  <div class="login">
    <div class="login__frame">
      <!-- HERO — pale blue-grey gradient, script wordmark -->
      <div class="login__hero">
        <div class="login__wordmark">Cadence</div>
        <div class="login__subtitle">your handwritten week</div>
      </div>

      <!-- PANEL — warm paper surface, sign-in affordances -->
      <div class="login__panel">
        <p class="login__label">Sign in to get started</p>

        <button
          type="button"
          class="login__oauth-btn login__oauth-btn--google"
          :disabled="auth.isLoading || !auth.isConfigured"
          @click="signInWithGoogle"
        >
          <span class="login__oauth-icon" aria-hidden="true">
            <!-- Google "G" — official four-color mark, unmodified per brand guidelines -->
            <svg width="20" height="20" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z" />
            </svg>
          </span>
          <span class="login__oauth-label">Sign in with Google</span>
          <span class="login__oauth-spacer" aria-hidden="true"></span>
        </button>

        <button type="button" class="login__oauth-btn login__oauth-btn--apple" @click="signInWithApple">
          <span class="login__oauth-icon" aria-hidden="true">
            <!-- Apple logo — monochrome, unmodified per brand guidelines -->
            <svg width="17" height="20" viewBox="0 0 17 20" fill="#FFFFFF">
              <path d="M14.06 15.53c-.28.64-.6 1.23-.98 1.78-.52.73-.94 1.24-1.27 1.52-.5.46-1.05.7-1.63.71-.42 0-.92-.12-1.5-.36-.58-.24-1.12-.36-1.6-.36-.5 0-1.05.12-1.66.36-.6.24-1.1.37-1.46.38-.56.02-1.12-.22-1.68-.73-.36-.3-.8-.82-1.32-1.57-.56-.8-1.02-1.72-1.38-2.78C.7 13.57.5 12.5.5 11.46c0-1.2.26-2.23.78-3.1a4.6 4.6 0 0 1 1.63-1.65 4.4 4.4 0 0 1 2.2-.62c.44 0 1.02.14 1.75.4.72.27 1.19.4 1.4.4.15 0 .67-.16 1.55-.47.83-.29 1.53-.41 2.1-.36 1.55.13 2.72.74 3.5 1.84-1.39.84-2.07 2.02-2.06 3.53.01 1.18.44 2.16 1.28 2.94.38.36.8.64 1.28.84-.1.3-.21.59-.33.87zM11.2.4c0 .9-.33 1.74-.98 2.51-.79.92-1.74 1.45-2.77 1.37a2.8 2.8 0 0 1-.02-.34c0-.86.38-1.78 1.05-2.53.33-.38.76-.7 1.28-.95.52-.25 1.01-.39 1.47-.41.01.12.02.24.02.35z" />
            </svg>
          </span>
          <span class="login__oauth-label">Sign in with Apple</span>
          <span class="login__oauth-spacer" aria-hidden="true"></span>
        </button>

        <p class="login__fineprint">
          By continuing you agree to our
          <a href="#" @click.prevent>Terms</a> &amp;
          <a href="#" @click.prevent>Privacy</a>.
        </p>
        <p v-if="auth.error" class="login__error">{{ auth.error }}</p>

        <div class="login__home-indicator" aria-hidden="true"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'

const auth = useAuthStore()
const router = useRouter()

watch(
  () => auth.isSignedIn,
  (isSignedIn) => {
    if (isSignedIn) void router.replace('/')
  },
  { immediate: true }
)

async function signInWithGoogle(): Promise<void> {
  await auth.signInWithGoogle()
}

function signInWithApple(): void {
  auth.error = 'Apple 登入尚未開啟。'
}
</script>

<style scoped>
.login {
  height: 100svh;
  width: 100%;
  display: flex;
  justify-content: center;
  background: var(--cd-topbar);
}

.login__frame {
  width: 100%;
  max-width: 420px;
  height: 100svh;
  max-height: 900px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ---------- Hero ---------- */
.login__hero {
  flex: 7;
  background: linear-gradient(180deg, #e8edf0 0%, #eef2f4 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 30px;
}

.login__wordmark {
  font-family: var(--cd-font-script);
  font-weight: 600;
  font-size: var(--cd-fs-46);
  line-height: 1;
  color: var(--cd-ink);
}

.login__subtitle {
  margin-top: 10px;
  font: 400 var(--cd-fs-15) var(--cd-font-ui);
  color: var(--cd-muted);
}

/* ---------- Panel ---------- */
.login__panel {
  flex: 3;
  background: var(--cd-inbox-paper);
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 暖色 panel 延伸進底部 safe-area，避免露出外層 --cd-topbar 的色差帶 */
  padding: 22px 24px env(safe-area-inset-bottom);
}

.login__label {
  margin: 0 0 16px;
  font: 400 var(--cd-fs-12) var(--cd-font-ui);
  color: var(--cd-muted);
}

/* ---------- OAuth buttons ---------- */
.login__oauth-btn {
  width: 100%;
  display: flex;
  align-items: center;
  border-radius: var(--cd-radius-pill);
  padding: 15px 18px;
  margin-bottom: 12px;
  font: 600 var(--cd-fs-15) var(--cd-font-ui);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background var(--cd-duration-micro-3) var(--cd-ease-standard),
    transform var(--cd-duration-micro-1) var(--cd-ease-standard);
}

.login__oauth-btn:active {
  transform: scale(0.99);
}

.login__oauth-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.login__oauth-icon {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login__oauth-label {
  flex: 1;
  text-align: center;
}

/* mirror-width spacer so the label sits optically centered despite the leading icon */
.login__oauth-spacer {
  flex: 0 0 20px;
  width: 20px;
}

.login__oauth-btn--google {
  background: #ffffff;
  color: var(--cd-ink);
  border-color: var(--cd-line-2);
  box-shadow: var(--cd-shadow-frame);
}

.login__oauth-btn--google:hover {
  background: #faf9f6;
}

.login__oauth-btn--apple {
  background: #1a1a1a;
  color: #ffffff;
  border-color: #1a1a1a;
}

.login__oauth-btn--apple:hover {
  background: #262626;
}

.login__oauth-btn--apple .login__oauth-icon svg {
  margin-top: -2px;
}

/* ---------- Fine print + home indicator ---------- */
.login__fineprint {
  margin: 6px 0 0;
  font: 400 var(--cd-fs-11) var(--cd-font-ui);
  color: var(--cd-muted);
  text-align: center;
}

.login__fineprint a {
  color: var(--cd-muted);
  text-decoration: underline;
}

.login__error {
  width: 100%;
  margin: 10px 0 0;
  font: 400 var(--cd-fs-12) var(--cd-font-ui);
  color: #9a3328;
  text-align: center;
}

.login__home-indicator {
  margin-top: auto;
  margin-bottom: 9px;
  width: 134px;
  height: 5px;
  border-radius: var(--cd-radius-pill);
  background: var(--cd-scrim-strong);
}
</style>
