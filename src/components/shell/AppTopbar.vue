<template>
  <div class="topbar">
    <button class="brand" type="button" @click="ui.activeView = 'month'">
      <img :src="publicIconPath('favicon-32x32.png')" alt="" class="brand-icon" />
      <span class="mark">CADENCE</span>
    </button>
    <AppTabs />
    <div class="spacer" />
    <InboxButton />
  </div>
</template>

<script setup lang="ts">
import AppTabs from './AppTabs.vue'
import InboxButton from './InboxButton.vue'
import { useUiStore } from '@/stores/ui-store'
import { publicIconPath } from '@/utils/public-assets'

const ui = useUiStore()
</script>

<style scoped lang="sass">
.topbar
  display: flex
  align-items: center
  gap: 24px
  padding: 22px 28px 18px
  border-bottom: 1px solid $line
  position: sticky
  top: 0
  background: $bar
  z-index: 30

.brand
  display: flex
  align-items: center
  gap: 10px
  margin-right: 6px
  border: none
  background: none
  padding: 0
  cursor: pointer
  border-radius: 8px
  transition: .12s

  &:hover
    background: rgba(0, 0, 0, .04)

  .brand-icon
    width: 26px
    height: 26px

  .mark
    font-family: 'JetBrains Mono', ui-monospace, monospace
    font-weight: 800
    font-size: 19px
    letter-spacing: -.02em

.spacer
  flex: 1

@media (max-width: 640px)
  .topbar
    gap: 8px
    padding: 14px 16px 12px

  .brand
    margin-right: 0

    .mark
      display: none

  :deep(.tabs)
    display: none

  .spacer
    display: none
</style>
