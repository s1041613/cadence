<template>
  <!--
    v2 日檢視主檢視。重用既有 store/util，外觀照設計稿。
    大日期 header + MY GOAL 卡 + SCHEDULE/MY DAY tab 切換。
    範圍（本階段）：SCHEDULE 用真實 tasksStore；MY GOAL 固定預設圖；MY DAY 只做 UI（寫死示範資料）。
  -->
  <div class="dv2">
    <div class="dv2__body" v-touch-swipe.horizontal.mouse="onSwipe">
      <div class="dv2__header">
        <Pv2DayHeader
          :day-num="dayNum"
          :dow="dow"
          :month-year="monthYear"
          :unfinished-count="unfinishedCount"
          :unfinished-open="unfinishedOpen"
          @today="goToday"
          @toggle-unfinished="unfinishedOpen = !unfinishedOpen"
        />
      </div>

      <!-- TEMP: MY GOAL card hidden while the timeline is being reworked -->
      <!-- <Pv2GoalCard class="dv2__goal" :text="goalText" :image="goalImage" /> -->

      <!-- TEMP: tabs hidden while the timeline rendering is reworked; restore with the panel switch below -->
      <!-- <Pv2DayTabs v-model="activeTab" class="dv2__tabs" /> -->

      <div class="pv2-slide-viewport dv2__viewport">
        <Transition :name="transitionName">
          <div class="dv2__panel" :key="dayKey">
            <DaySchedule />
            <!-- <DaySchedule v-if="activeTab === 'schedule'" /> -->
            <!-- <DayMyDay v-else /> -->
          </div>
        </Transition>
      </div>
    </div>

    <Pv2Fab @click="onCreate" />
    <Pv2BottomNav active="draft" />

    <!-- Teleported to the page frame so the scrim covers the whole phone frame rather than
         only this view's box; `defer` for the same remount-ordering reason MonthViewV2 gives.
         The Transition sits inside so pv2-sheet (app.css) still fades scrim and panel
         together; :duration matches --cd-duration-sheet. -->
    <Teleport defer to="#dp2-root">
      <Transition name="pv2-sheet" :duration="300">
        <DayUnfinishedSheet
          v-if="unfinishedOpen"
          :date="ui.selectedDate"
          :is-today="isToday"
          @close="unfinishedOpen = false"
        />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Pv2DayHeader from '@/components/v2/ui/Pv2DayHeader.vue'
// TEMP: restore alongside the MY GOAL card in the template
// import Pv2GoalCard from '@/components/v2/ui/Pv2GoalCard.vue'
// TEMP: restore alongside the tabs block in the template
// import Pv2DayTabs from '@/components/v2/ui/Pv2DayTabs.vue'
import DaySchedule from '@/components/v2/day/DaySchedule.vue'
import DayUnfinishedSheet from '@/components/v2/day/DayUnfinishedSheet.vue'
// import DayMyDay from '@/components/v2/day/DayMyDay.vue'
import Pv2Fab from '@/components/v2/ui/Pv2Fab.vue'
import Pv2BottomNav from '@/components/v2/ui/Pv2BottomNav.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { parseISO, iso, addDays, WD_CAP } from '@/utils/convert-date-time'
import { useDateSwipe } from '@/composables/use-date-swipe'
import { useUnfinished } from '@/composables/use-unfinished'
// TEMP: restore alongside the MY GOAL card
// import { publicAssetPath } from '@/utils/public-assets'

const ui = useUiStore()
const tasksStore = useTasksStore()

const cur = computed(() => parseISO(ui.selectedDate))
const dayNum = computed(() => cur.value.getDate())
const dow = computed(() => WD_CAP[cur.value.getDay()]!.toUpperCase())
const monthYear = computed(() =>
  new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(cur.value).toUpperCase()
)

// A day step is just ±1 day, unlike week's arithmetic against weekStart.
function stepDayBy(delta: number): void {
  ui.selectedDate = iso(addDays(cur.value, delta))
}

// Re-keying the panel on the date is what drives the slide transition.
const dayKey = computed(() => ui.selectedDate)

const isToday = computed(() => ui.selectedDate === iso(new Date()))

// Only the count lives here; the sheet reads the same composable for the rows, so the number
// on the pill and the list behind it can never disagree.
const selectedDate = computed(() => ui.selectedDate)
const { count: unfinishedCount } = useUnfinished(selectedDate)

// Component-local, like the tab state below and for the same reason as ui-store's monthFilter:
// this is the shape the screen is in right now, not a preference the account carries.
// Swiping to another day keeps it open — the sheet re-reads the new date — but a day with
// nothing overdue has no control to close, so it closes itself.
const unfinishedOpen = ref(false)
watch(unfinishedCount, (n) => {
  if (n === 0) unfinishedOpen.value = false
})

// No view-local overlays here — the composable already covers the page-shell overlays
// (this view opens QuickAdd from DaySchedule.vue).
const { onSwipe, transitionName, setDirection } = useDateSwipe({ step: stepDayBy })

function goToday(): void {
  const today = new Date()
  setDirection(today.getTime() - cur.value.getTime())
  ui.selectedDate = iso(today)
}

// TEMP: tab 切換：元件 local state，切日期不重置
// const activeTab = ref<'schedule' | 'myday'>('schedule')

// TEMP: MY GOAL（本階段固定預設圖 + 文字，不做上傳/持久化）
// const goalText = 'Ship the week-view redesign and clear inbox to zero.'
// const goalImage = publicAssetPath('v2-backgrounds/default.jpg')

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
  /* Pv2BottomNav floats over the frame now instead of taking its own flex row, so
     this body has to give up the clearance itself or the time grid scrolls under the
     pill. .dv2__viewport (.pv2-slide-viewport, app.css) is flex:1 inside this column,
     so padding here — not on .dv2__panel, which is only inset:0 inside that viewport
     — is what actually shrinks the viewport's height. */
  padding-bottom: var(--pv2-nav-h);
  overflow: hidden;
  /* The horizontal day-swipe lives here; pan-y leaves the time grid's vertical scroll alone. */
  touch-action: pan-y;
}

/* The panel is absolutely positioned inside the viewport, so its own margin would not apply —
   the gap under the header belongs to the viewport now. */
.dv2__viewport {
  margin-top: 18px;
}

/* 6 (body) + 9 lands the day numeral's visual top 20px below the frame, level with Week,
   Notebook and Settings. Unlike the other three this one is not pure line-box arithmetic: the
   numeral is bottom-aligned in .pv2-dh__row (align-items: flex-end) against the taller
   DOW/month-year column, which pushes it a further ~3.6px down. That offset was measured in the
   browser, so re-check it if the meta column's size or spacing changes. */
.dv2__header {
  flex: none;
  padding-top: 9px;
}

.dv2__goal {
  flex: none;
  margin-top: 18px;
}

.dv2__tabs {
  flex: none;
  margin-top: 18px;
}

/* The time grid is its own scroll container (the ALL-DAY row has to stay pinned above the
   axis rather than scroll with it), so this layer never scrolls — that would nest scrollers.
   Height and offset now come from .pv2-slide-viewport, which absolutely positions this. */
.dv2__panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  scrollbar-width: none;
}

.dv2__panel::-webkit-scrollbar {
  display: none;
}
</style>
