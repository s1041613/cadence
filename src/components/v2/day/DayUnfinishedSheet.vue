<template>
  <!--
    未完成待辦：比檢視中的日期早、而且還沒打勾的 quadrant 待辦，全部在這裡。
    不截斷、不設回看上限、不收合任何一組——裝不下就在清單裡捲。
    高度固定（見 .du2），與筆數無關：每次打開都一樣高，上面永遠留著日期和一段時間軸。
  -->
  <div class="du2-scrim" @click="emit('close')">
    <div class="du2" role="dialog" aria-label="未完成待辦" @click.stop>
      <!-- Swipe-to-dismiss is bound to the handle only: the list below owns its own scroll,
           and a sheet-wide gesture would swallow it. Same split as Pv2DaySheet. -->
      <div class="du2__handle-zone" v-touch-swipe.down.mouse="() => emit('close')">
        <div class="du2__handle" />
      </div>

      <div class="du2__head">
        <span class="du2__head-text">
          <span class="du2__title">未完成</span>
          <span class="du2__count">{{ count }} 筆</span>
        </span>
        <button type="button" class="du2__mode" @click="toggleSelecting">
          {{ selecting ? '完成' : '選取' }}
        </button>
      </div>

      <div class="du2__list">
        <template v-for="bucket in buckets" :key="bucket.key">
          <div class="du2__group">
            <span class="du2__group-label">{{ bucket.label }} · {{ bucket.items.length }}</span>
            <button
              v-if="!selecting"
              type="button"
              class="du2__group-action"
              :aria-label="`把「${bucket.label}」這組的 ${bucket.items.length} 筆${moveVerb}`"
              @click="moveMany(bucket.items)"
            >
              整組{{ moveVerb }}
            </button>
          </div>

          <template v-for="task in bucket.items" :key="task.id">
            <!-- Deleting removes a real remote row and the toast here has no undo of its own,
                 so the row asks first rather than reporting afterwards. -->
            <div v-if="confirmId === task.id" class="du2__row du2__row--confirm">
              <span class="du2__bar" :style="{ background: colorOf(task) }" />
              <span class="du2__confirm-text">刪除「{{ task.title }}」？</span>
              <button type="button" class="du2__confirm-btn du2__confirm-cancel" @click="confirmId = null">取消</button>
              <button type="button" class="du2__confirm-btn du2__confirm-ok" @click="remove(task)">刪除</button>
            </div>

            <label v-else-if="selecting" class="du2__row du2__row--select">
              <input
                type="checkbox"
                class="du2__check-input"
                :checked="selected.has(task.id)"
                @change="toggleSelected(task.id)"
              />
              <span class="du2__check" :data-on="selected.has(task.id)">
                <CdIcon v-if="selected.has(task.id)" name="check" :size="11" :stroke-width="3.4" color="#fff" />
              </span>
              <span class="du2__bar" :style="{ background: colorOf(task) }" />
              <span class="du2__text">
                <span class="du2__row-title">{{ task.title }}</span>
                <span class="du2__meta">{{ metaOf(task) }}</span>
              </span>
            </label>

            <div v-else class="du2__row">
              <span class="du2__bar" :style="{ background: colorOf(task) }" />
              <span class="du2__text">
                <span class="du2__row-title">{{ task.title }}</span>
                <span class="du2__meta">{{ metaOf(task) }}</span>
              </span>
              <button
                type="button"
                class="du2__act du2__act--primary"
                :aria-label="`把「${task.title}」${moveVerb}`"
                @click="moveMany([task])"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3.5 12h11" />
                  <path d="M11 8.5 14.5 12 11 15.5" />
                  <path d="M19.5 5v14" />
                </svg>
              </button>
              <button
                type="button"
                class="du2__act"
                :aria-label="`刪除「${task.title}」`"
                @click="confirmId = task.id"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4.5 7h15" />
                  <path d="M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
                  <path d="M6.5 7l.8 11.2A1.8 1.8 0 0 0 9.1 20h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
                </svg>
              </button>
            </div>
          </template>
        </template>
      </div>

      <!-- No top-level "move everything": at thirty rows that button sweeps month-old tasks
           into today in one tap. Bulk goes through a selection, which is deliberate by
           construction. -->
      <div v-if="selecting" class="du2__foot">
        <!-- The bulk delete confirms in the bar the user is already looking at, the same way a
             single row confirms in itself. -->
        <template v-if="bulkConfirm">
          <span class="du2__confirm-text">刪除選取的 {{ selected.size }} 筆？</span>
          <button type="button" class="du2__confirm-btn du2__confirm-cancel" @click="bulkConfirm = false">取消</button>
          <button type="button" class="du2__confirm-btn du2__confirm-ok" @click="removeSelected">刪除</button>
        </template>
        <template v-else>
          <button
            type="button"
            class="du2__bulk"
            :disabled="selected.size === 0"
            @click="moveMany(selectedTasks)"
          >
            {{ moveVerb }} · {{ selected.size }}
          </button>
          <button
            type="button"
            class="du2__bulk-del"
            :disabled="selected.size === 0"
            :aria-label="`刪除選取的 ${selected.size} 筆`"
            @click="bulkConfirm = true"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.5 7h15" />
              <path d="M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
              <path d="M6.5 7l.8 11.2A1.8 1.8 0 0 0 9.1 20h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
            </svg>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CdIcon from '@/components/ui/CdIcon.vue'
import { useTasksStore } from '@/stores/tasks-store'
import { useUnfinished } from '@/composables/use-unfinished'
import { themeOf } from '@/composables/use-theme'
import { notifyUndo } from '@/lib/notify'
import { daysBetween, pad, parseISO } from '@/utils/convert-date-time'
import { movedToDate } from '@/utils/move-task-to-date'
import type { Task } from '@/types/task'

const props = defineProps<{
  /** The day being viewed — what "overdue" is measured against, and where a move lands. */
  date: string
  /** Whether that day is today, which is the only thing the action's wording turns on. */
  isToday: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const tasksStore = useTasksStore()
const date = computed(() => props.date)
const { tasks, buckets, count } = useUnfinished(date)

const moveVerb = computed(() => (props.isToday ? '移到今天' : '移到這天'))

const selecting = ref(false)
const selected = ref(new Set<string>())
const confirmId = ref<string | null>(null)
const bulkConfirm = ref(false)

// A row can leave the list under the selection (moved, deleted, or checked off elsewhere), and
// a stale id would make the bulk buttons count rows that are no longer there.
watch(tasks, (list) => {
  const live = new Set(list.map((t) => t.id))
  for (const id of selected.value) if (!live.has(id)) selected.value.delete(id)
  if (confirmId.value !== null && !live.has(confirmId.value)) confirmId.value = null
  if (selected.value.size === 0) bulkConfirm.value = false
})

const selectedTasks = computed(() => tasks.value.filter((t) => selected.value.has(t.id)))

function toggleSelecting(): void {
  selecting.value = !selecting.value
  selected.value = new Set()
  confirmId.value = null
  bulkConfirm.value = false
}

function toggleSelected(id: string): void {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

const colorOf = (task: Task): string => themeOf(task).backgroundColor

function metaOf(task: Task): string {
  const cur = parseISO(task.date)
  const stamp = `${pad(cur.getMonth() + 1)}/${pad(cur.getDate())}`
  return `${stamp} · 逾期 ${daysBetween(task.date, props.date)} 天`
}

/**
 * Moves each task onto the viewed day. The re-dating itself is movedToDate(); what belongs here
 * is the snapshot taken first, which is the whole of the undo — saving the originals back is
 * exactly the inverse, however many rows went at once.
 */
function moveMany(list: Task[]): void {
  if (list.length === 0) return
  const before = list.map((t) => ({ ...t }))

  for (const task of before) tasksStore.saveTask(movedToDate(task, props.date))

  selected.value = new Set()
  bulkConfirm.value = false
  notifyUndo(`${before.length} 筆已${moveVerb.value}`, () => {
    for (const task of before) tasksStore.saveTask(task)
  })
}

function remove(task: Task): void {
  confirmId.value = null
  tasksStore.deleteTask(task.id)
}

function removeSelected(): void {
  for (const task of selectedTasks.value) tasksStore.deleteTask(task.id)
  selected.value = new Set()
  bulkConfirm.value = false
}
</script>

<style scoped>
.du2-scrim {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: flex-end;
}

/* The backdrop is a pseudo-element so the pv2-sheet transition (app.css) can fade it without
   an ancestor opacity that would fade the panel with it — same construction as Pv2DaySheet. */
.du2-scrim::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(var(--pv2-ink-rgb), 0.32);
  pointer-events: none;
}

/* Fixed at half the frame, whatever the list holds: three rows and thirty open the same way,
   so the pill, the first row and the amount of day still showing are all where they were last
   time. A percentage and not vh — this is positioned inside the page frame, and on desktop
   that frame is a fixed 393x852 device shell inside a much taller window.
   50% is Pv2DaySheet's height too; a second sheet a few points off it would read as a slip. */
.du2 {
  position: relative;
  width: 100%;
  height: 50%;
  display: flex;
  flex-direction: column;
  background: var(--pv2-canvas);
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -12px 34px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

.du2__handle-zone {
  flex: none;
  padding: 10px 0 8px;
  touch-action: none;
  cursor: grab;
}

.du2__handle {
  width: 40px;
  height: 5px;
  border-radius: 3px;
  background: var(--pv2-line);
  margin: 0 auto;
}

.du2__head {
  flex: none;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 0 18px 12px;
  border-bottom: 1px solid var(--pv2-line-soft);
}

.du2__head-text {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.du2__title {
  font: 600 17px var(--cd-font-ui);
  color: var(--pv2-ink);
}

.du2__count {
  font: 500 12px var(--cd-font-mono);
  color: var(--pv2-ink-3);
}

.du2__mode {
  flex: none;
  border: none;
  background: none;
  padding: 4px 2px;
  font: 600 12.5px var(--cd-font-ui);
  color: var(--pv2-accent-ink);
  cursor: pointer;
}

.du2__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.du2__list::-webkit-scrollbar {
  display: none;
}

/* Sticky so the bucket you are reading in still names itself after you have scrolled past its
   header — with thirty rows that is the difference between a list and a pile. */
.du2__group {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 18px 8px;
  background: rgba(var(--pv2-canvas-rgb), 0.94);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.du2__group-label {
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.1em;
  color: var(--pv2-ink-3);
}

.du2__group-action {
  flex: none;
  border: none;
  background: none;
  padding: 4px 2px;
  font: 600 11.5px var(--cd-font-ui);
  color: var(--pv2-accent-ink);
  cursor: pointer;
}

.du2__row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 18px;
  border-bottom: 1px solid var(--pv2-line-soft);
}

.du2__row--select {
  cursor: pointer;
}

.du2__row--confirm {
  background: rgba(var(--pv2-accent-rgb), 0.06);
}

.du2__bar {
  flex: none;
  width: 3px;
  height: 30px;
  border-radius: 2px;
}

.du2__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.du2__row-title {
  font: 600 14px/18px var(--cd-font-ui);
  color: var(--pv2-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.du2__meta {
  font: 500 10.5px/13px var(--cd-font-mono);
  letter-spacing: 0.02em;
  color: var(--pv2-ink-3);
}

/* The real input carries the state and the keyboard; the span next to it is the drawing.
   Visually hidden rather than display:none, which would take it out of the tab order. */
.du2__check-input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.du2__check {
  flex: none;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.6px solid rgba(var(--pv2-ink-rgb), 0.28);
}

.du2__check[data-on='true'] {
  border-color: var(--pv2-accent-ink);
  background: var(--pv2-accent-ink);
}

.du2__check-input:focus-visible + .du2__check {
  outline: 2px solid var(--pv2-accent-ink);
  outline-offset: 2px;
}

/* 32 visible, 44 hittable: the touch target is taken outside the layout box so the row can
   stay 48 tall. Same trick as Pv2TypeSwitch's segments. */
.du2__act {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 10px;
  background: none;
  color: var(--pv2-ink-3);
  cursor: pointer;
}

.du2__act::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
}

/* Moving is what this sheet is for; deleting is the other thing you can do. The tint says
   which is which without a second word of copy. */
.du2__act--primary {
  background: rgba(var(--pv2-accent-rgb), 0.12);
  color: var(--pv2-accent-ink);
}

.du2__act svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.du2__confirm-text {
  flex: 1;
  min-width: 0;
  font: 500 13px/17px var(--cd-font-ui);
  color: var(--pv2-ink-2);
}

.du2__confirm-btn {
  flex: none;
  height: 30px;
  border: none;
  border-radius: 9px;
  font: 600 12px var(--cd-font-ui);
  cursor: pointer;
}

.du2__confirm-cancel {
  padding: 0 10px;
  background: transparent;
  color: var(--pv2-ink-2);
}

.du2__confirm-ok {
  padding: 0 12px;
  background: var(--pv2-accent-ink);
  color: var(--pv2-on-accent);
}

.du2__foot {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px 26px;
  border-top: 1px solid var(--pv2-line-soft);
}

.du2__bulk {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 14px;
  background: var(--pv2-accent-ink);
  color: var(--pv2-on-accent);
  font: 600 14px var(--cd-font-ui);
  cursor: pointer;
}

.du2__bulk-del {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 14px;
  background: var(--pv2-fill);
  color: var(--pv2-ink-2);
  cursor: pointer;
}

.du2__bulk-del svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.du2__bulk:disabled,
.du2__bulk-del:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
