<template>
  <div class="mcell" :class="{ out: !inMonth, today: date === today }" @click="emit('pick-day', date)">
    <span class="dn mono">{{ dateObj.getDate() }}</span>
    <div class="mcell-acts">
      <button class="mcell-btn add" aria-label="在這天新增任務" @click.stop="emit('add-task', { date })">+</button>
    </div>
    <div class="mtasks">
      <div
        v-for="t in tasks.slice(0, 2)"
        :key="t.id"
        class="mchip"
        :class="{ wtime: showTime, hollow: !t.allDay, done: t.done }"
        :style="chipStyle(t)"
        @click.stop="emit('open', t.id)"
      >
        {{ chipText(t) }}
      </div>
      <div v-if="tasks.length > 2" class="more mono">+{{ tasks.length - 2 }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '@/types/task'
import { themeOf } from '@/composables/use-theme'
import { parseISO, iso } from '@/utils/convert-date-time'

const props = defineProps<{
  date: string
  tasks: Task[]
  inMonth: boolean
  showTime: boolean
}>()

const emit = defineEmits<{
  'add-task': [initialValues: Partial<Task>]
  'pick-day': [date: string]
  open: [taskId: string]
}>()

const today = iso(new Date())
const dateObj = computed(() => parseISO(props.date))

function chipText(t: Task): string {
  if (props.showTime && !t.allDay && t.start) {
    return `${t.start.replace(':', '')}–${t.end.replace(':', '')} ${t.title}`
  }
  return t.title
}

function chipStyle(t: Task): Record<string, string> {
  const th = themeOf(t)
  const solid = t.allDay
  return solid
    ? { background: th.backgroundColor, color: th.textColor, borderColor: th.backgroundColor }
    : { background: 'transparent', color: th.backgroundColor, borderColor: th.backgroundColor }
}
</script>

<style scoped lang="sass">
.mcell
  min-height: 96px
  border-top: 1px solid $line
  border-left: 1px solid $line
  padding: 8px 9px
  position: relative
  cursor: pointer
  transition: .12s

  &:hover
    background: $paper

    .mcell-acts
      opacity: 1
      transform: scale(1)

  &.out
    background: #DFE3D8

    .dn
      color: $ink-3

  &.today .dn
    background: $ink
    color: $paper
    border-radius: 6px
    padding: 1px 6px

.dn
  font-family: 'JetBrains Mono', ui-monospace, monospace
  font-size: 14px
  font-weight: 600

.mcell-acts
  position: absolute
  top: 6px
  right: 6px
  display: flex
  gap: 4px
  opacity: 0
  transform: scale(.8)
  transition: .12s
  z-index: 3

.mcell-btn
  width: 22px
  height: 22px
  border-radius: 7px
  border: none
  cursor: pointer
  display: grid
  place-items: center
  line-height: 0

  &.add
    background: $btn
    color: $ink
    font-family: 'JetBrains Mono', ui-monospace, monospace
    font-size: 16px
    font-weight: 600

  &:hover
    filter: brightness(.96)

.mtasks
  margin-top: 6px
  display: flex
  flex-direction: column
  gap: 3px

.mchip
  font-size: 10px
  line-height: 1.3
  background: $ink
  color: $paper
  border: 1px solid $ink
  border-radius: 4px
  padding: 2px 5px
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis

  &.wtime
    font-family: 'JetBrains Mono', ui-monospace, monospace
    font-size: 9.5px
    letter-spacing: -.01em

  &.hollow
    background: transparent
    font-weight: 600

  &.done
    text-decoration: line-through
    opacity: .5

.more
  font-size: 9.5px
  color: $ink-2
  font-family: 'JetBrains Mono', ui-monospace, monospace
</style>
