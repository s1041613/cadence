<template>
  <!--
    MY DAY 分頁（照設計稿）：MEAL PLAN 四格 + REMINDER 可勾選清單 + NOTES。
    本階段純 UI：資料寫死示範內容，reminder 勾選只綁 local ref（不持久化，重整消失）。
  -->
  <div class="dmd">
    <!-- MEAL PLAN -->
    <section class="dmd__section">
      <h3 class="dmd__label">MEAL PLAN</h3>
      <div class="dmd__meal">
        <div v-for="m in meals" :key="m.slot" class="dmd__meal-row">
          <span class="dmd__meal-slot">{{ m.slot }}</span>
          <span class="dmd__meal-text">{{ m.text }}</span>
        </div>
      </div>
    </section>

    <!-- REMINDER -->
    <section class="dmd__section">
      <h3 class="dmd__label">REMINDER</h3>
      <ul class="dmd__reminders">
        <li v-for="r in reminders" :key="r.id" class="dmd__reminder">
          <button
            type="button"
            class="dmd__check"
            :class="{ 'dmd__check--on': r.done }"
            :aria-pressed="r.done"
            aria-label="Toggle reminder"
            @click="r.done = !r.done"
          >
            <svg v-if="r.done" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fafaf9" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12 L10 17 L19 7" />
            </svg>
          </button>
          <span class="dmd__reminder-text" :class="{ 'dmd__reminder-text--done': r.done }">{{ r.text }}</span>
        </li>
      </ul>
    </section>

    <!-- NOTES -->
    <section class="dmd__section">
      <h3 class="dmd__label">NOTES</h3>
      <div class="dmd__notes">{{ notes }}</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 本階段全部寫死示範資料（照設計稿），無資料層。
const meals: Array<{ slot: string; text: string }> = [
  { slot: 'BREAKFAST', text: 'Oatmeal & berries' },
  { slot: 'LUNCH', text: 'Soba + salad' },
  { slot: 'DINNER', text: 'w/ dad — izakaya' },
  { slot: 'SNACK', text: 'Almonds' }
]

// done 綁 local ref，勾選有反應但不持久化。
const reminders = ref([
  { id: 'r1', text: 'Renew gym membership', done: true },
  { id: 'r2', text: 'Book Kyoto ryokan', done: false },
  { id: 'r3', text: 'Reply to Mia', done: false }
])

const notes = 'Remember to book the Kyoto ryokan before Friday.'
</script>

<style scoped>
.dmd {
  display: flex;
  flex-direction: column;
  gap: 26px;
  padding-bottom: 8px;
}

.dmd__label {
  margin: 0 0 12px;
  font: 600 12px var(--cd-font-mono);
  letter-spacing: 0.14em;
  color: #1b1b1b;
}

/* MEAL PLAN 卡：四列，左 slot 標右內容 */
.dmd__meal {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.dmd__meal-row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(27, 27, 27, 0.06);
}

.dmd__meal-row:last-child {
  border-bottom: none;
}

.dmd__meal-slot {
  flex: none;
  width: 84px;
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.1em;
  color: #9c9c9c;
}

.dmd__meal-text {
  flex: 1;
  min-width: 0;
  font: 500 16px var(--cd-font-ui);
  color: #1b1b1b;
}

/* REMINDER 清單 */
.dmd__reminders {
  list-style: none;
  margin: 0;
  padding: 0;
}

.dmd__reminder {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 2px;
  border-bottom: 1px solid rgba(27, 27, 27, 0.08);
}

/* 深色圓角方框 checkbox（照設計稿，非 olive 圓） */
.dmd__check {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  border: 1.8px solid #cdcdcd;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.dmd__check--on {
  background: #1b1b1b;
  border-color: #1b1b1b;
}

.dmd__reminder-text {
  font: 500 16px var(--cd-font-ui);
  color: #1b1b1b;
}

.dmd__reminder-text--done {
  color: #b2b2b2;
  text-decoration: line-through;
}

/* NOTES 卡：斜體 serif 文字 */
.dmd__notes {
  padding: 20px 22px;
  min-height: 96px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  font: italic 400 16px var(--cd-font-serif);
  line-height: 1.5;
  color: #6e6e6e;
}
</style>
