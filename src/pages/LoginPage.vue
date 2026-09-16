<template>
  <div class="login">
    <div class="login__frame">
      <BrandHero />
      <LoginPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'
import BrandHero from '@/components/login/BrandHero.vue'
import LoginPanel from '@/components/login/LoginPanel.vue'

const auth = useAuthStore()
const router = useRouter()

watch(
  () => auth.isSignedIn,
  (isSignedIn) => {
    if (isSignedIn) void router.replace('/')
  },
  { immediate: true }
)
</script>

<style scoped>
/*
 * The splash palette. Page-scoped rather than added to cadence-tokens.css because it is
 * deliberately neither of the app's two palettes: the brand surface avoids pure white and
 * pure black, which --pv2-canvas and --pv2-ink are. A palette swap should not repaint the
 * sign-in screen, so these values do not belong in the swappable set.
 *
 * Values are spec §3. The -rgb triple exists because the muted ink and the hairline are
 * washes of it, and composing them as literals would freeze them if the ink ever moved.
 */
.login {
  --login-surface-page: #FCFAFA;
  --login-ink: #595452;
  --login-ink-rgb: 89, 84, 82;
  --login-ink-muted: rgba(var(--login-ink-rgb), 0.52);
  --login-pink: #D77D96;
  --login-pink-rgb: 215, 125, 150;
  --login-pink-soft: #F5DCE2;
  --login-grid-line: var(--login-pink);
  --login-hairline: rgba(var(--login-pink-rgb), 0.16);
  --login-danger: #C66770;

  --login-surface-panel: rgba(253, 250, 250, 0.72);
  --login-surface-google: #FFFFFF;
  --login-surface-google-hover: #FAF6F7;
  --login-surface-apple: rgba(244, 235, 236, 0.72);
  --login-surface-apple-hover: rgba(238, 226, 228, 0.88);

  /* height:100% (anchored to the initial containing block), not 100dvh: on an iOS standalone
     cold start the viewport units report the full screen including the status bar, so the
     shell renders taller than the webview and the whole page becomes scrollable. src/css/app.css
     carries the same note for the app shell. The frame's own vertical share is a percentage of
     this for the same reason. */
  height: 100%;
  width: 100%;
  overflow-y: auto;
  background: var(--login-surface-page);
  color: var(--login-ink);
}

/* height, not min-height: the hero's share of the frame is a flex-basis percentage, and a
   percentage basis against an indefinite height silently falls back to the content size —
   which collapses the hero onto the wordmark and hands the whole page to the panel. When the
   content does not fit, the two children overflow and .login scrolls. */
.login__frame {
  position: relative;
  max-width: 430px;
  height: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

/* The bottom-left pink wash (spec §6 — a pseudo-element, no image). ::before rather than
   ::after so it paints under both children, which are positioned and come later in the box
   tree.
   It is a gradient painted across inset:0 rather than a blob hanging off the corner, because
   a shape that overhangs the frame would have to be clipped — and clipping the frame is what
   would stop .login from scrolling when a short screen pushes the footer past the fold. */
.login__frame::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 64% 26% at 4% 99%, var(--login-pink-soft) 0%, transparent 100%);
  pointer-events: none;
}
</style>
