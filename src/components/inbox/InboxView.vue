<template>
  <div class="inbox-wrap">
    <div class="viewhead">
      <div>
        <div class="eyebrow">Inbox</div>
      </div>
    </div>
    <div class="inbox-input" @click="focusInput">
      <span class="ii-plus mono">+</span>
      <input
        ref="inputRef"
        v-model="inbox.inboxDraft"
        placeholder="Jot down a quick idea…"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
        @keydown="onEnterKeydown($event, add)"
      />
    </div>
    <div v-if="inbox.inboxItems.length === 0" class="empty">
      <div class="big">The box is empty</div>
      Toss in an idea when it strikes.
    </div>
    <div v-else class="inbox-list">
      <div v-for="item in inbox.inboxItems" :key="item.id" class="inbox-card card">
        <div class="body" @click="promote(item.id)">
          <div class="ttl">{{ item.text }}</div>
        </div>
        <button class="x-btn" @click.stop="inbox.removeItem(item.id)">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useInboxStore } from '@/stores/inbox-store'
import { useUiStore } from '@/stores/ui-store'
import { useImeSafeEnter } from '@/composables/use-ime-safe-enter'

const inbox = useInboxStore()
const ui = useUiStore()
const { onCompositionStart, onCompositionEnd, onEnterKeydown } = useImeSafeEnter()

const inputRef = ref<HTMLInputElement | null>(null)

function focusInput(): void {
  inputRef.value?.focus()
}

function add(): void {
  const text = inbox.inboxDraft.trim()
  if (!text) return
  inbox.addItem(text)
  inbox.inboxDraft = ''
}

function promote(id: string): void {
  const item = inbox.promoteItem(id)
  if (!item) return
  ui.taskEditorInitialValues = { title: item.text }
}
</script>

<style scoped lang="sass">
.inbox-wrap
  max-width: 620px

.viewhead
  display: flex
  align-items: flex-end
  justify-content: space-between
  margin-bottom: 22px
  gap: 20px
  flex-wrap: wrap

.eyebrow
  font-size: 10.5px
  letter-spacing: .22em
  text-transform: uppercase
  color: $ink-3
  font-weight: 600

.inbox-input
  display: flex
  align-items: center
  gap: 10px
  padding: 18px 22px
  border: 1.5px dashed $line-2
  border-radius: 14px
  background: none
  cursor: text
  transition: .15s
  margin-bottom: 24px

  &:hover
    border-color: $ink-3

  &:focus-within
    border-color: $ink-3

  .ii-plus
    font-size: 20px
    color: $ink-3
    line-height: 0
    flex: none

  input
    flex: 1
    border: none
    outline: none
    font-size: 16px
    font-weight: 600
    background: none
    color: $ink
    padding: 0

    &::placeholder
      color: $ink-3
      font-weight: 600

.inbox-list
  display: flex
  flex-direction: column
  gap: 10px

.inbox-card
  display: flex
  align-items: center
  gap: 16px
  padding: 16px 18px
  cursor: pointer
  transition: .15s

  &:hover
    border-color: $ink-3

  .body
    flex: 1
    min-width: 0
    cursor: pointer

  .ttl
    font-size: 15.5px
    font-weight: 600
    margin-top: 2px
    overflow: hidden
    text-overflow: ellipsis
    white-space: nowrap

.card
  background: $surface
  border: 1px solid $line
  border-radius: 14px

.x-btn
  border: none
  background: none
  color: $ink-3
  font-size: 18px
  line-height: 0
  padding: 8px
  flex: none

  &:hover
    color: $ink

.empty
  padding: 60px 20px
  text-align: center
  color: $ink-3

  .big
    font-size: 15px
    color: $ink-2
    font-weight: 600
    margin-bottom: 6px
</style>
