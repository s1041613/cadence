<template>
  <!--
    格子內事件 chip，兩種呈現：
    - 整天（allDay）：實心事件色 + 白字，連續 bar。
    - 定時（timed）：事件色的淡色填底 + 深墨字，單格 pill。

    兩種都是「填色」而不是一個填色一個描邊：設計稿的格線很輕，白底描邊的 chip 在那種
    輕線之間會糊成第二層格線。淡色填底則是一塊面，即使 9px 的字也還讀得出邊界。
    底色由事件自己的顏色調淡（tintOf），不是固定的 rose——顏色是使用者資料，
    月曆頁換皮不該把它洗掉；設計稿之所以整片粉，是因為稿裡的事件本來就同一色。

    A multi-day event is ONE chip stretched across its columns by the week row, not one chip per
    day — so the title renders once and there is no seam to hide. The continues flags only square
    off the end that a week boundary cut, leaving the real start and end rounded.
  -->
  <span
    v-if="allDay"
    class="pv2-chip pv2-chip--allday"
    :class="edgeClass"
    :style="allDayStyle"
  ><span class="pv2-chip__label">{{ title }}</span></span>
  <span
    v-else
    class="pv2-chip pv2-chip--timed"
    :class="[edgeClass, { 'pv2-chip--outlined': !tint }]"
    :style="timedStyle"
  ><span class="pv2-chip__label">{{ title }}</span></span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { tintOf } from './event-colors'

const props = withDefaults(
  defineProps<{
    title: string
    color: string
    allDay: boolean
    /** The span carries on past this week row, so this end is cut rather than finished. */
    continuesLeft?: boolean
    continuesRight?: boolean
  }>(),
  { continuesLeft: false, continuesRight: false }
)

const edgeClass = computed(() => ({
  'pv2-chip--cut-left': props.continuesLeft,
  'pv2-chip--cut-right': props.continuesRight
}))

// 18%：再淡就分不出兩個相鄰事件的顏色，再濃就吃掉深墨字的對比。
const tint = computed(() => tintOf(props.color, 0.18))

// 整天：實心事件色 + 白字
const allDayStyle = computed(() => ({
  background: props.color,
  color: '#fff'
}))

// 定時：淡色填底 + 深墨字。顏色解析不出來（舊資料存了非 hex）時退回白底描邊，
// 至少還看得出是哪個事件色，而不是一塊沒有底的字。
const timedStyle = computed(() =>
  tint.value ? { background: tint.value } : { borderColor: props.color, color: props.color }
)
</script>

<style scoped>
/* 高度是 month-lanes 的 CELL.chipH：字 9.5px x 1.3 ≈ 13，加上下 padding 1+1 = 15。
   改字級就要一起改 CELL.chipH，否則每格會多算或少算一條 chip。

   9.5px 與 3px 的橫向 padding 是被欄寬決定的，不是隨手挑的：393 寬的手機一欄 56px，
   扣掉格子與 bar 的 gutter 剩約 46px，剛好放得下五個中文字。再大一級就會切在第五個字上，
   而中文標題的前五個字通常就是它全部的辨識度。 */
.pv2-chip {
  display: flex;
  align-items: center;
  max-width: 100%;
  padding: 1px 3px;
  border-radius: var(--pv2-radius-chip);
  font: 500 9.5px/1.3 var(--cd-font-ui);
  letter-spacing: -0.02em;
}

/* Hard single line, sliced at the box edge.
 *
 * This used to wrap per character (word-break: break-all) and hide everything past
 * one line-height, so a glyph that didn't fully fit moved to a hidden second line
 * rather than being cut. That never actually held: the label's box rounds up to a
 * whole pixel while the line does not, and the top of the second line bled through
 * that gap as a row of specks under the title.
 *
 * nowrap removes the second line altogether, which is the only way to guarantee the
 * bleed cannot come back at some other size. The flex parent vertically centers it
 * so top/bottom spacing is even. */
.pv2-chip__label {
  display: block;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
}

.pv2-chip--allday {
  font-weight: 600;
}

/* 淡底上的字用中性深墨而不是事件色本身：同一個色系的深淺對比在 10px 會糊，
   深墨字則不管底色是哪個色相都讀得到。 */
.pv2-chip--timed {
  color: var(--pv2-ink-body);
}

/* tintOf 解析失敗的退路（見 script）。border 只在這個 class 上，正常路徑沒有邊。 */
.pv2-chip--outlined {
  border: 1px solid;
  padding: 0 2px;
  background: #fff;
}

/* A cut end is square: the rounded end is what says "the event starts/ends here", so leaving it
   rounded at a week boundary would read as two separate events rather than one continuing. */
.pv2-chip--cut-left {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.pv2-chip--cut-right {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
</style>
