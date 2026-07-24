<template>
  <!--
    v2 日檢視主檢視。重用既有 store/util，外觀照設計稿。
    大日期 header + MY GOAL 卡 + SCHEDULE/MY DAY tab 切換。
    範圍（本階段）：SCHEDULE 用真實 tasksStore；MY GOAL 固定預設圖；MY DAY 只做 UI（寫死示範資料）。
  -->
  <div class="dv2">
    <div class="dv2__body">
      <div class="dv2__header">
        <Pv2DayHeader
          :day-num="dayNum"
          :dow="dow"
          :month-year="monthYear"
          @prev="stepDayBy(-1)"
          @next="stepDayBy(1)"
        />
      </div>

      <Pv2GoalCard class="dv2__goal" :text="goalText" :image="goalImage" />

      <Pv2DayTabs v-model="activeTab" class="dv2__tabs" />

      <div class="dv2__panel">
        <DaySchedule v-if="activeTab === 'schedule'" />
        <DayMyDay v-else />
      </div>
    </div>

    <Pv2Fab class="dv2__fab" @click="onCreate" />
    <Pv2BottomNav active="draft" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Pv2DayHeader from '@/components/v2/ui/Pv2DayHeader.vue'
import Pv2GoalCard from '@/components/v2/ui/Pv2GoalCard.vue'
import Pv2DayTabs from '@/components/v2/ui/Pv2DayTabs.vue'
import DaySchedule from '@/components/v2/day/DaySchedule.vue'
import DayMyDay from '@/components/v2/day/DayMyDay.vue'
import Pv2Fab from '@/components/v2/ui/Pv2Fab.vue'
import Pv2BottomNav from '@/components/v2/ui/Pv2BottomNav.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { parseISO, iso, addDays, WD_CAP } from '@/utils/convert-date-time'

const ui = useUiStore()
const tasksStore = useTasksStore()

const cur = computed(() => parseISO(ui.selectedDate))
const dayNum = computed(() => cur.value.getDate())
const dow = computed(() => WD_CAP[cur.value.getDay()]!.toUpperCase())
const monthYear = computed(() =>
  new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(cur.value).toUpperCase()
)

// Day 就是單純 ±1 天（不同於 week 對 weekStart 加減）
function stepDayBy(delta: number): void {
  ui.selectedDate = iso(addDays(cur.value, delta))
}

// tab 切換：元件 local state，切日期不重置
const activeTab = ref<'schedule' | 'myday'>('schedule')

// MY GOAL（本階段固定預設圖 + 文字，不做上傳/持久化）
const goalText = 'Ship the week-view redesign and clear inbox to zero.'
const goalImage = '/v2-backgrounds/default.jpg'

function onCreate(): void {
  if (tasksStore.isLoading) return
  ui.createOpen = true
}
</script>

<style scoped>
.dv2 {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.dv2__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 6px 22px 12px;
  overflow: hidden;
}

.dv2__header {
  flex: none;
  padding-top: 8px;
}

.dv2__goal {
  flex: none;
  margin-top: 18px;
}

.dv2__tabs {
  flex: none;
  margin-top: 18px;
}

/* 分頁內容撐滿剩餘高度，內部自捲 */
.dv2__panel {
  flex: 1;
  min-height: 0;
  margin-top: 18px;
  overflow-y: auto;
  scrollbar-width: none;
}

.dv2__panel::-webkit-scrollbar {
  display: none;
}

/* FAB 浮在底部 nav 之上（同月曆/週） */
.dv2__fab {
  bottom: 115px;
}
</style>
