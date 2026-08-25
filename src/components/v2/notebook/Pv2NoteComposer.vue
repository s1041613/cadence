<template>
  <CdSheet scrim-color="var(--cd-scrim-heavy)" @scrim-click="emit('close')" @dismiss="emit('close')">
    <form class="nbc" @submit.prevent="emit('submit')">
      <textarea
        ref="field"
        :value="modelValue"
        class="nbc__input"
        rows="2"
        placeholder="What would you like to do?"
        aria-label="New note"
        @input="onInput"
        @keydown.meta.enter.prevent="emit('submit')"
        @keydown.ctrl.enter.prevent="emit('submit')"
      />

      <div class="nbc__tags" aria-label="Note tag">
        <button class="nbc__tag" :class="{ 'nbc__tag--active': selectedTagId === null }" type="button" @click="emit('update:selectedTagId', null)">
          All
        </button>
        <button
          v-for="tag in tags"
          :key="tag.id"
          class="nbc__tag"
          :class="{ 'nbc__tag--active': selectedTagId === tag.id }"
          type="button"
          @click="emit('update:selectedTagId', tag.id)"
        >
          {{ tag.name }}
        </button>
        <form v-if="isAddingTag" class="nbc__tag-form" @submit.prevent="commitTag">
          <input
            ref="tagField"
            v-model="tagDraft"
            class="nbc__tag-input"
            type="text"
            aria-label="New tag"
            @blur="commitTag"
            @keydown.esc.prevent="cancelTag"
          />
        </form>
        <button v-else class="nbc__tag-add" type="button" aria-label="New tag" @click="startTag">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9c9c9c" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M12 5 V19 M5 12 H19" />
          </svg>
        </button>
      </div>

      <div class="nbc__footer">
        <div class="nbc__time" aria-label="Today 09:00">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f4f4f" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
            <path d="M8 3.5 V7.5 M16 3.5 V7.5 M4 10 H20" />
            <path d="M8 14 H8.1 M12 14 H12.1 M16 14 H16.1 M8 17 H8.1 M12 17 H12.1" />
          </svg>
          <span>Today 09:00</span>
        </div>
        <button class="nbc__send" type="submit" aria-label="Add note">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#cfcfcf" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 19 V5" />
            <path d="M5.5 11.5 L12 5 L18.5 11.5" />
          </svg>
        </button>
      </div>
    </form>
  </CdSheet>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef } from 'vue'
import type { NoteTag } from '@/types/note'
import CdSheet from '@/components/ui/CdSheet.vue'

defineProps<{
  modelValue: string
  selectedTagId: string | null
  tags: NoteTag[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:selectedTagId': [value: string | null]
  submit: []
  close: []
  addTag: [name: string]
}>()

const field = useTemplateRef<HTMLTextAreaElement>('field')
const tagField = useTemplateRef<HTMLInputElement>('tagField')
const isAddingTag = ref(false)
const tagDraft = ref('')

onMounted(async () => {
  await nextTick()
  field.value?.focus()
})

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

async function startTag(): Promise<void> {
  tagDraft.value = ''
  isAddingTag.value = true
  await nextTick()
  tagField.value?.focus()
}

function cancelTag(): void {
  tagDraft.value = ''
  isAddingTag.value = false
}

function commitTag(): void {
  const name = tagDraft.value
  if (name.trim() !== '') emit('addTag', name)
  cancelTag()
}
</script>

<style scoped>
.nbc {
  display: flex;
  flex-direction: column;
  padding: 20px 26px 0;
  background: #fff;
}

.nbc__input {
  width: 100%;
  min-height: 76px;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font: 400 22px var(--cd-font-mono);
  line-height: 1.32;
  color: #1b1b1b;
}

.nbc__input::placeholder {
  color: #777;
}

.nbc__tags {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  margin: 14px -26px 0;
  padding: 0 26px 12px;
  scrollbar-width: none;
}

.nbc__tags::-webkit-scrollbar {
  display: none;
}

.nbc__tag,
.nbc__tag-add,
.nbc__tag-form {
  flex: none;
  height: 34px;
  border: 1px solid #e2e2e2;
  border-radius: 999px;
  background: #fff;
}

.nbc__tag {
  min-width: 64px;
  padding: 0 15px;
  font: 600 12px var(--cd-font-mono);
  color: #4f4f4f;
  cursor: pointer;
}

.nbc__tag--active {
  border-color: #1b1b1b;
  background: #1b1b1b;
  color: #fafaf9;
}

.nbc__tag-add {
  width: 34px;
  display: grid;
  place-items: center;
  border-style: dashed;
  cursor: pointer;
}

.nbc__tag-form {
  width: 118px;
  display: flex;
  align-items: center;
  padding: 0 12px;
}

.nbc__tag-input {
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: 600 12px var(--cd-font-mono);
  color: #1b1b1b;
}

.nbc__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-top: 14px;
}

.nbc__time {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  font: 700 12px var(--cd-font-mono);
  color: #4f4f4f;
}

.nbc__send {
  flex: none;
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  padding: 0;
  border: 1.5px solid #e0e0dd;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
}

.nbc__send:active {
  transform: scale(0.96);
}
</style>
