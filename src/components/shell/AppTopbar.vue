<template>
  <div class="topbar">
    <div class="brand">
      <img src="/icons/favicon-32x32.png" alt="" class="brand-icon" />
      <span class="mark">CADENCE</span>
    </div>
    <AppTabs />
    <div class="spacer" />
    <InboxButton />
  </div>
</template>

<script setup lang="ts">
import AppTabs from './AppTabs.vue'
import InboxButton from './InboxButton.vue'
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

  .brand-icon
    width: 22px
    height: 22px

  .mark
    font-family: 'JetBrains Mono', ui-monospace, monospace
    font-weight: 800
    font-size: 19px
    letter-spacing: -.02em

.spacer
  flex: 1
</style>
