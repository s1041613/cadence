<template>
  <!--
    v2 設定 · Adjusted Times 子頁。骨架照 Notifications：header(back)+scroll+card。
    列出每一筆「開始時間已過後才被改動」的事件/任務，最新調整的排最上面。點一列跳去
    Day 頁看那一天——這裡不重建整張預覽卡，只負責「我後來查得到」這件事。
  -->
  <div class="pv2-te">
    <header class="pv2-te__head">
      <button type="button" class="pv2-te__back" aria-label="返回" @click="emit('back')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pv2-ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 5 L8 12 L15 19" />
        </svg>
      </button>
      <h1 class="pv2-te__title">Adjusted Times</h1>
    </header>

    <div class="pv2-te__scroll">
      <p v-if="rows.length === 0" class="pv2-te__empty">
        Nothing here yet — this fills in once you move an event's time after it was already supposed to start.
      </p>

      <div v-else class="pv2-te__card">
        <button
          v-for="(row, i) in rows"
          :key="row.id"
          type="button"
          class="pv2-te__row"
          :class="{ 'pv2-te__row--divided': i > 0 }"
          @click="openDay(row.date)"
        >
          <div class="pv2-te__row-text">
            <div class="pv2-te__row-label">{{ row.title || 'Untitled' }}</div>
            <div class="pv2-te__row-sub">{{ row.scheduledLabel }} · adjusted {{ row.editedLabel }}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pv2-ink-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 5 L16 12 L9 19" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTasksStore } from '@/stores/tasks-store'
import { useUiStore } from '@/stores/ui-store'

const emit = defineEmits<{
  back: []
}>()

const tasksStore = useTasksStore()
const ui = useUiStore()
const router = useRouter()

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function scheduledLabel(date: string, start: string): string {
  const [, m, d] = date.split('-').map(Number) as [number, number, number]
  return `${MONTHS[m - 1]} ${d}, ${start}`
}

// The stored value is a full instant (toISOString()), not a bare calendar date, so parsing it
// with `new Date` is exactly right here — unlike task.date, there is no local-day ambiguity.
function editedLabel(timeEditedAt: string): string {
  const editedAt = new Date(timeEditedAt)
  const diffMinutes = Math.round((Date.now() - editedAt.getTime()) / 60_000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr ago`
  const diffDays = Math.round(diffHours / 24)
  return diffDays === 1 ? 'yesterday' : `${diffDays} days ago`
}

const rows = computed(() =>
  tasksStore.timeEditedTasks.map((t) => ({
    id: t.id,
    title: t.title,
    date: t.date,
    scheduledLabel: scheduledLabel(t.date, t.start),
    editedLabel: editedLabel(t.timeEditedAt)
  }))
)

function openDay(date: string): void {
  ui.selectedDate = date
  void router.push('/v2/day')
}
</script>

<style scoped>
.pv2-te {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: var(--pv2-fill);
}

.pv2-te__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 22px 16px;
  border-bottom: 1px solid var(--pv2-line-soft);
}

.pv2-te__back {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--pv2-line);
  background: #fff;
  cursor: pointer;
}

.pv2-te__title {
  margin: 0;
  font: 400 30px var(--cd-font-serif);
  line-height: 1;
  color: var(--pv2-ink);
}

.pv2-te__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 22px var(--pv2-nav-h);
}

.pv2-te__empty {
  margin: 12px 4px 0;
  font: 400 13px var(--cd-font-ui);
  color: var(--pv2-ink-3);
  line-height: 1.6;
}

.pv2-te__card {
  border: 1px solid var(--pv2-line-soft);
  border-radius: 16px;
  background: #fff;
  overflow: hidden;
}

.pv2-te__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px 18px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.pv2-te__row--divided::before {
  content: '';
  position: absolute;
  top: 0;
  left: 18px;
  right: 0;
  height: 1px;
  background: var(--pv2-line-soft);
}

.pv2-te__row-text {
  flex: 1;
  min-width: 0;
}

.pv2-te__row-label {
  font: 600 13px var(--cd-font-mono);
  letter-spacing: 0.06em;
  color: var(--pv2-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv2-te__row-sub {
  margin-top: 3px;
  font: 400 12px var(--cd-font-ui);
  color: var(--pv2-ink-3);
}
</style>
