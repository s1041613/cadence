<template>
  <div class="login">
    <div class="login__frame">
      <!-- Decorative sparkles/marks scattered over the hero. Purely ornamental — hidden from a11y tree. -->
      <div class="login__decor" aria-hidden="true">
        <svg class="login__mark login__mark--sparkle-a" viewBox="0 0 24 24" fill="none">
          <path d="M12 1c0 5 2 8 7 9-5 1-7 4-7 9-0-5-2-8-7-9 5-1 7-4 7-9Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
        </svg>
        <svg class="login__mark login__mark--sparkle-b" viewBox="0 0 24 24" fill="none">
          <path d="M12 1c0 5 2 8 7 9-5 1-7 4-7 9-0-5-2-8-7-9 5-1 7-4 7-9Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
        </svg>
        <svg class="login__mark login__mark--plus-a" viewBox="0 0 24 24">
          <path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <div class="login__mark login__mark--pixel">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="login__blob"></div>
        <div class="login__ticks">
          <span class="login__tick login__tick--a"></span>
          <span class="login__tick login__tick--b"></span>
        </div>
      </div>

      <!-- HERO — graph-paper ground, cross-stitched wordmark -->
      <div class="login__hero">
        <img class="login__wordmark" src="@/assets/login-wordmark.svg" alt="Cadence" />
      </div>

      <!-- PANEL — floating card, sign-in affordances -->
      <div class="login__panel">
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
            <!-- Apple logo — monochrome, unmodified per brand guidelines; recolored via currentColor for the tinted lockup -->
            <svg width="17" height="20" viewBox="0 0 17 20" fill="currentColor">
              <path d="M14.06 15.53c-.28.64-.6 1.23-.98 1.78-.52.73-.94 1.24-1.27 1.52-.5.46-1.05.7-1.63.71-.42 0-.92-.12-1.5-.36-.58-.24-1.12-.36-1.6-.36-.5 0-1.05.12-1.66.36-.6.24-1.1.37-1.46.38-.56.02-1.12-.22-1.68-.73-.36-.3-.8-.82-1.32-1.57-.56-.8-1.02-1.72-1.38-2.78C.7 13.57.5 12.5.5 11.46c0-1.2.26-2.23.78-3.1a4.6 4.6 0 0 1 1.63-1.65 4.4 4.4 0 0 1 2.2-.62c.44 0 1.02.14 1.75.4.72.27 1.19.4 1.4.4.15 0 .67-.16 1.55-.47.83-.29 1.53-.41 2.1-.36 1.55.13 2.72.74 3.5 1.84-1.39.84-2.07 2.02-2.06 3.53.01 1.18.44 2.16 1.28 2.94.38.36.8.64 1.28.84-.1.3-.21.59-.33.87zM11.2.4c0 .9-.33 1.74-.98 2.51-.79.92-1.74 1.45-2.77 1.37a2.8 2.8 0 0 1-.02-.34c0-.86.38-1.78 1.05-2.53.33-.38.76-.7 1.28-.95.52-.25 1.01-.39 1.47-.41.01.12.02.24.02.35z" />
            </svg>
          </span>
          <span class="login__oauth-label">Sign in with Apple</span>
          <span class="login__oauth-spacer" aria-hidden="true"></span>
        </button>

        <p v-if="auth.error" class="login__error">{{ auth.error }}</p>
      </div>

      <!-- FOOTER — tagline over the graph paper; the corner blob lives in .login__decor
           so it anchors to the frame's own corner instead of the footer's (short) box -->
      <div class="login__footer">
        <p class="login__tagline">Plan <span class="login__tagline-dot">✦</span> Focus <span class="login__tagline-dot">✦</span> A kinder you</p>
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
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  background: var(--cd-surface-raised);
}

.login__frame {
  position: relative;
  width: 100%;
  max-width: 420px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #fbf0ed;
  background-image:
    repeating-linear-gradient(0deg, rgba(199, 108, 122, .14) 0 1px, transparent 1px 28px),
    repeating-linear-gradient(90deg, rgba(199, 108, 122, .14) 0 1px, transparent 1px 28px);
}

/* 桌面才做 letterbox 框；手機一律滿版（Pro Max 956pt 若被 cap 在 900 會留永久色帶） */
@media (hover: hover) and (pointer: fine) {
  .login__frame {
    max-height: 900px;
  }
}

/* ---------- Decor: sparkles + plus marks scattered over the hero ---------- */
.login__decor {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.login__mark {
  position: absolute;
}

.login__mark--sparkle-a {
  top: 11%;
  left: 17%;
  width: 15px;
  height: 15px;
  color: #d98298;
}

.login__mark--sparkle-b {
  top: 18%;
  left: 7%;
  width: 28px;
  height: 28px;
  color: #d98298;
}

.login__mark--plus-a {
  top: 25%;
  left: 15%;
  width: 13px;
  height: 13px;
  color: #2e2a28;
}

/* A tiny stepped 2x2 pixel cluster, echoing the wordmark's stitch texture. */
.login__mark--pixel {
  top: 46%;
  right: 8%;
  width: 14px;
  height: 14px;
}

.login__mark--pixel span {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #d98298;
}

.login__mark--pixel span:nth-child(1) { top: 0; left: 4px; }
.login__mark--pixel span:nth-child(2) { top: 4px; left: 0; }
.login__mark--pixel span:nth-child(3) { top: 4px; left: 8px; }
.login__mark--pixel span:nth-child(4) { top: 8px; left: 4px; }

.login__blob {
  position: absolute;
  left: -70px;
  bottom: -90px;
  width: 240px;
  height: 240px;
  border-radius: 58% 42% 55% 45% / 55% 45% 58% 42%;
  background: #f3cdd1;
  opacity: .9;
}

.login__ticks {
  position: absolute;
  left: 22px;
  bottom: 46px;
}

.login__tick {
  position: absolute;
  width: 3px;
  height: 16px;
  border-radius: var(--cd-radius-pill);
  background: #d98298;
}

.login__tick--a {
  transform: rotate(-22deg);
}

.login__tick--b {
  left: 12px;
  top: -4px;
  transform: rotate(-22deg);
}

/* ---------- Hero ---------- */
.login__hero {
  position: relative;
  z-index: 1;
  flex: 7;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 26px;
}

/* Cross-stitched lockup (stars + "Cadence" + flourish) — generated from the same
   star/flourish paths this page used to draw live, rasterized to a stitch grid and
   redrawn as X-stitches. A live web font could not reproduce the fabric texture, so
   this one lockup ships as a static asset (src/assets/login-wordmark.svg); every
   other mark on this page stays plain vector. */
.login__wordmark {
  width: min(78%, 300px);
  height: auto;
}

/* ---------- Panel ---------- */
.login__panel {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  padding: 26px 22px 22px;
  border-radius: 32px 32px 0 0;
  background: var(--cd-surface-raised);
  box-shadow: 0 -10px 28px -14px rgba(46, 30, 26, .2);
}

/* ---------- OAuth buttons ---------- */
.login__oauth-btn {
  width: 100%;
  display: flex;
  align-items: center;
  border-radius: var(--cd-radius-pill);
  padding: 15px 18px;
  margin-bottom: 12px;
  font: 700 var(--cd-fs-15) var(--cd-font-ui);
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 16px -8px rgba(46, 30, 26, .22);
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
}

.login__oauth-btn--google:hover {
  background: #faf9f6;
}

.login__oauth-btn--apple {
  background: #e7c9c7;
  color: #3a2a28;
}

.login__oauth-btn--apple:hover {
  background: #e0bcba;
}

.login__oauth-btn--apple .login__oauth-icon svg {
  margin-top: -2px;
}

.login__error {
  width: 100%;
  margin: 10px 0 0;
  font: 400 var(--cd-fs-12) var(--cd-font-ui);
  color: #9a3328;
  text-align: center;
}

/* ---------- Footer: tagline over the graph paper ---------- */
.login__footer {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 24px calc(18px + env(safe-area-inset-bottom, 0px));
}

.login__tagline {
  position: relative;
  z-index: 1;
  margin: 0;
  font: 600 var(--cd-fs-11) var(--cd-font-ui);
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--cd-ink-muted);
  text-align: center;
}

.login__tagline-dot {
  color: #d98298;
  letter-spacing: 0;
}
</style>
