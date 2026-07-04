<template>
  <button class="inbox-btn" :class="{ on: ui.inboxOpen }" aria-label="Inbox" @click="ui.inboxOpen = !ui.inboxOpen">
    <img
      class="inbox-icon"
      :src="iconSrc"
      :srcset="iconSrcset"
      alt=""
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui-store'
import { useInboxStore } from '@/stores/inbox-store'
import { publicIconPath, publicIconSrcset } from '@/utils/public-assets'

const ui = useUiStore()
const inbox = useInboxStore()

const iconName = computed(() => (inbox.inboxItems.length > 0 ? 'inbox' : 'inbox-empty'))
const iconSrc = computed(() => publicIconPath(`${iconName.value}-32.png`))
const iconSrcset = computed(() => publicIconSrcset(iconName.value))
</script>

<style scoped lang="sass">
.inbox-btn
  display: flex
  align-items: center
  justify-content: center
  border: none
  border-radius: 999px
  width: 44px
  height: 44px
  padding: 0
  flex: none
  cursor: pointer
  transition: .15s
  background: transparent

  &:hover
    filter: brightness(.92)

  &.on
    box-shadow: 0 0 0 2px $ink

.inbox-icon
  width: 28px
  height: 28px
  flex: none
  display: block

.inbox-label
  display: none

@media (max-width: 640px)
  .inbox-btn
    margin-left: auto

  .inbox-icon
    width: 24px
    height: 24px
</style>
