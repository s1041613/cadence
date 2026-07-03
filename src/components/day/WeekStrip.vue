<template>
  <div class="weekstrip">
    <button class="ws-nav" title="上一週" @click="ui.selectedDate = iso(addDays(cursorDate, -7))">‹</button>
    <button
      v-for="(wd, i) in week"
      :key="i"
      class="ws-day"
      :class="{ sel: iso(wd) === ui.selectedDate, today: iso(wd) === today }"
      @click="ui.selectedDate = iso(wd)"
    >
      <div class="ws-head">
        <span class="ws-wd">{{ WD_CAP[wd.getDay()] }}</span>
        <span class="ws-dn mono">{{ wd.getDate() }}</span>
      </div>
      <div class="ws-dots">
        <span
          v-for="t in dotsFor(wd).slice(0, 4)"
          :key="t.id"
          class="wd-dot"
          :class="{ done: t.done }"
        />
      </div>
    </button>
    <button class="ws-nav" title="下一週" @click="ui.selectedDate = iso(addDays(cursorDate, 7))">›</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import type { Task } from '@/types/task'
import { addDays, iso, parseISO, WD_CAP } from '@/utils/convert-date-time'

const ui = useUiStore()
const tasksStore = useTasksStore()

const today = iso(new Date())
const cursorDate = computed(() => parseISO(ui.selectedDate))

const week = computed(() => {
  const d = cursorDate.value
  const sun = addDays(d, -d.getDay())
  return Array.from({ length: 7 }, (_, i) => addDays(sun, i))
})

function dotsFor(wd: Date): Task[] {
  const dt = iso(wd)
  return tasksStore.tasks.filter((t) => t.date === dt)
}
</script>

<style scoped lang="sass">
.weekstrip
  display: flex
  align-items: center
  gap: 6px
  margin-bottom: 24px

.ws-nav
  flex: none
  width: 30px
  height: 30px
  border: none
  background: none
  border-radius: 50%
  opacity: .55
  cursor: pointer
  color: $ink-2
  transition: .15s

  &:hover
    opacity: 1
    color: $ink
    background: $surface

.ws-day
  flex: 1
  display: flex
  flex-direction: column
  align-items: center
  gap: 10px
  background: none
  border: none
  border-radius: 12px
  padding: 10px 4px
  cursor: pointer
  transition: .15s

  &:hover
    background: $surface

  &.today .ws-wd
    color: $now

.ws-head
  display: flex
  align-items: center
  gap: 8px

.ws-wd
  font-size: 13px
  color: $ink-3
  font-weight: 600

.ws-dn
  font-family: 'JetBrains Mono', ui-monospace, monospace
  font-size: 16px
  font-weight: 700
  color: $ink
  width: 26px
  height: 26px
  border-radius: 50%
  display: grid
  place-items: center

.ws-day.sel .ws-dn
  background: $ink
  color: $paper

.ws-dots
  display: flex
  gap: 4px
  min-height: 7px

  .wd-dot
    width: 7px
    height: 7px
    border-radius: 50%
    background: $ink-3

    &.done
      background: $line-2

@media (max-width: 640px)
  .weekstrip
    gap: 2px
  .ws-head
    flex-direction: column
    gap: 2px
  .ws-wd
    font-size: 11px
</style>
