<template>
  <!--
    v2 共用底部 nav。month / week / draft / setting 皆可點（router push 到對應 v2 route）。
  -->
  <nav class="pv2-nav">
    <button
      v-for="n in items"
      :key="n.key"
      type="button"
      class="pv2-nav__item"
      :class="{ 'pv2-nav__item--disabled': !n.enabled }"
      :disabled="!n.enabled"
      @click="onTap(n)"
    >
      <span class="pv2-nav__glyph" :class="{ 'pv2-nav__glyph--on': n.key === active }">{{ n.glyph }}</span>
      <span class="pv2-nav__label" :class="{ 'pv2-nav__label--on': n.key === active }">{{ n.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

type NavKey = 'month' | 'week' | 'draft' | 'setting'

defineProps<{
  active: NavKey
}>()

const router = useRouter()

// enabled 的項目才可點
const items: Array<{ key: NavKey; glyph: string; label: string; enabled: boolean; to?: string }> = [
  { key: 'month', glyph: 'm', label: 'month', enabled: true, to: '/v2/month' },
  { key: 'week', glyph: 'w', label: 'week', enabled: true, to: '/v2/week' },
  { key: 'draft', glyph: 'd', label: 'draft', enabled: true, to: '/v2/day' },
  { key: 'setting', glyph: 's', label: 'setting', enabled: true, to: '/v2/settings' }
]

function onTap(n: { enabled: boolean; to?: string }): void {
  if (!n.enabled || !n.to) return
  void router.push(n.to)
}
</script>

<style scoped>
.pv2-nav {
  flex: none;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  /* 白底吃進底部 safe-area：真機讓白色一路連續蓋到螢幕底（含 home indicator 區），
     不露出 frame 背景塗鴉/米色帶。無 safe-area（桌面）時退回 40px 視覺留白。 */
  padding: 12px 18px;
  padding-bottom: max(40px, calc(12px + env(safe-area-inset-bottom)));
  border-top: 1px solid #e2e2e2;
  background: #fff;
}

.pv2-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.pv2-nav__item--disabled {
  cursor: default;
}

.pv2-nav__glyph {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: transparent;
  font: 400 20px var(--cd-font-serif);
  line-height: 1;
  color: #6e6e6e;
}

.pv2-nav__glyph--on {
  background: #1b1b1b;
  color: #fafaf9;
}

.pv2-nav__label {
  font: 600 9px var(--cd-font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #9c9c9c;
}

.pv2-nav__label--on {
  color: #1b1b1b;
}
</style>
