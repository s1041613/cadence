<template>
  <!--
    週檢視單日列（照設計稿）：左側日期欄＝大日期數字（Instrument Serif，今天較黑）＋其下 DOW 標籤；
    其餘小字一律 Zen Kaku；
    右側事件列（色點 + 標題 + 右側時間 / all-day / —），空日留白不顯示佔位文字。
    今天：DOW 標籤轉為黑底反白藥丸。
  -->
  <div class="pv2-wdr">
    <!-- 日期欄：數字與 DOW 同屬一個識別單位，垂直堆疊後兩者共用同一條左邊界。 -->
    <div class="pv2-wdr__date">
      <span class="pv2-wdr__num" :class="{ 'pv2-wdr__num--today': today, 'pv2-wdr__num--outside': !inWeekFocus && !today }">
        {{ dayNum }}
      </span>
      <span class="pv2-wdr__dow" :class="{ 'pv2-wdr__dow--today': today }">{{ dowLabel }}</span>
    </div>

    <div class="pv2-wdr__body">
      <!-- 事件多時這區塊內部可捲，看得到全部 -->
      <!-- 空日不顯示任何佔位文字：左側日期數字已足以標示這一天存在，
           留白本身就讀作「沒安排」。 -->
      <div class="pv2-wdr__events">
        <button
          v-for="ev in events"
          :key="ev.id"
          type="button"
          class="pv2-wdr__event"
          @click="(e) => emit('eventClick', ev, e)"
        >
          <span class="pv2-wdr__dot" :style="{ background: ev.color }" />
          <span class="pv2-wdr__title">{{ ev.title }}</span>
          <!-- Says how much is hidden: the names below are capped, the count is not. -->
          <span v-if="ev.subtaskTotal" class="pv2-wdr__subcount">{{ ev.subtaskDone }}/{{ ev.subtaskTotal }}</span>
          <span class="pv2-wdr__time">{{ ev.timeLabel }}</span>
          <!-- Only the first few names: a week has to read at a glance, and the count above
               already says how much is hidden. -->
          <span v-if="ev.subtaskTitles.length" class="pv2-wdr__subs">{{ ev.subtaskTitles.join(' · ') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface Pv2WeekEvent {
  id: string
  title: string
  color: string
  timeLabel: string // "09:00" / "all-day" / "—"
  /** Only the first few. subtaskTotal carries the real size — one week row cannot hold a
   *  whole checklist. */
  subtaskTitles: string[]
  subtaskDone: number
  subtaskTotal: number
}

defineProps<{
  dayNum: number
  dowLabel: string
  today: boolean
  inWeekFocus: boolean // 保留：目前一週皆 focus；跨月時可用來淡化非當月日
  events: Pv2WeekEvent[]
}>()

const emit = defineEmits<{
  eventClick: [event: Pv2WeekEvent, mouseEvent: MouseEvent]
}>()
</script>

<style scoped>
.pv2-wdr {
  display: flex;
  align-items: stretch; /* body 撐滿 row 全高，事件區塊才有高度可捲 */
  gap: 18px;
  padding: 7px 0;
  /* 只裁上下、放行左右：等高時事件多的列仍在自身內裁切不撐高整體（clip-y），
     但今天的 DOW 藥丸要能往左凸出貼齊數字，左右不能裁（visible-x）。
     overflow:hidden 會兩軸都裁，藥丸的左半圓就被切成直角。 */
  overflow-x: visible;
  overflow-y: clip;
}

/* 左側日期欄：數字在上、DOW 在下，兩者在 74px 欄寬內置中。
   置中而非靠左：DOW（含今天的藥丸）要落在數字正下方才讀作同一個識別單位，
   靠左會讓窄的 DOW 吊在寬數字的左半邊。欄寬固定，所以各列的 DOW 彼此也還是對齊的，
   代價是個位數日期會比兩位數往右縮排。
   垂直仍靠上對齊：今天的 DOW 是藥丸、比純文字高 6px，若垂直置中會讓今天的數字
   相對其他天上移，七列的數字基線就參差了。 */
.pv2-wdr__date {
  flex: none;
  /* 46px＝欄內最寬的東西（兩位數日期，等寬 35px 下是 42px）再加一點餘裕。
     原本是 74px，那是照舊襯線斜體抓的——那時兩位數只有約 33px，欄寬本來就寬鬆，
     換成等寬字又改置中之後，左側就空出一大塊。收窄同時也把寬度還給右側事件標題。 */
  width: 46px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
}

/* 日期數字＝浮水印感：斜體、灰階墨色，像蓋在背景上的水印。
   背景是照片＋可調白紗（scrim 0/0.5/0.8），底色亮度不固定，
   所以非今天的數字必須夠深才讀得到；今天維持全黑，兩者落差仍然明顯。
   35px 略大於表頭 "Week N" 的 28px，維持原本 50/40 的比例（全站大標題同乘 0.7，見 Pv2DayHeader）。 */
.pv2-wdr__num {
  font: italic 400 35px var(--cd-font-serif);
  line-height: 1;
  color: rgba(27, 27, 27, 0.62); /* 非今天：約 4.5:1，仍明顯淡於今天 */
}

/* 今天：同樣斜體 serif，但更深、明顯浮出 */
.pv2-wdr__num--today {
  color: #1b1b1b;
}

.pv2-wdr__num--outside {
  color: rgba(27, 27, 27, 0.42);
}

.pv2-wdr__body {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  /* 數字 35px 且 line-height:1，事件首行對齊數字視覺中線而非頂緣。 */
  padding-top: 9px;
  overflow: hidden;
}

/* 事件區塊：事件多時內部捲動看全部。
   底部漸層淡出遮罩只吃最後 12px，讓「還有更多」有暗示但不咬掉第 3 件的字。 */
.pv2-wdr__events {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-y: auto;
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 10px), transparent);
  mask-image: linear-gradient(to bottom, #000 calc(100% - 10px), transparent);
}

.pv2-wdr__events::-webkit-scrollbar {
  display: none;
}

/* 10px 全大寫 Zen Kaku，字級小又有字距，原 #9c9c9c 在照片背景上只有約 2.2:1，改用 #6e6e6e。
   字距從 0.16em 收到 0.12em：0.16em 是為等寬臉調的，比例字身在小字級下會鬆散。 */
.pv2-wdr__dow {
  font: 500 10px var(--cd-font-ui);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6e6e6e;
}

/* 今天：黑底反白藥丸，沿用底部 nav 選中態的語彙（#1b1b1b 底 / #fafaf9 字）。
   標記做在 DOW 而非數字上，是因為週列等高：35px 的數字包圓圈需要約 50px 會超出列高，
   10px 的標籤加藥丸則完全在餘裕內。

   水平位置交給 .pv2-wdr__date 的 align-items: center，藥丸自己不再偏移。
   這裡曾有 margin-left:-7px 讓藥丸往左凸出，那是配合舊襯線斜體數字往左溢出的墨跡；
   換臉後墨跡不再溢出，改置中後也不需要任何補償。
   0.12em 字距會在最後一個字母後面多留一份空白，右側 padding 少 1px 才左右對稱。 */
.pv2-wdr__dow--today {
  padding: 3px 6px 3px 7px;
  border-radius: 999px;
  background: #1b1b1b;
  color: #fafaf9;
}

/* Two rows: dot / title / count / time on the first, subtask names on the second. A grid
   rather than flex so the second row aligns with the title instead of tucking under the dot. */
.pv2-wdr__event {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0 9px;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
}

.pv2-wdr__subcount {
  flex: none;
  font: 700 11px var(--cd-font-mono);
  font-variant-numeric: var(--cd-numeric-aligned);
  color: #9c9c9c;
}

/* Spans to the end, starting at the title column rather than the dot's. */
.pv2-wdr__subs {
  grid-column: 2 / -1;
  margin-top: 2px;
  font: 500 11.5px/1.4 var(--cd-font-ui);
  color: #9c9c9c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pv2-wdr__dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.pv2-wdr__title {
  flex: 1;
  min-width: 0;
  font: 500 13px/1.25 var(--cd-font-ui);
  color: #1b1b1b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 事件時間：維持次於標題的層級，但從 #9c9c9c 加深到 #6e6e6e 才讀得到。
   Zen Kaku 是比例字身，數字寬度不一致會讓右側時間欄參差，補 tabular-nums 對齊。 */
.pv2-wdr__time {
  flex: none;
  font: 500 11px var(--cd-font-ui);
  font-variant-numeric: var(--cd-numeric-aligned);
  letter-spacing: 0.04em;
  color: #6e6e6e;
}
</style>
