<template>
  <!--
    格子內事件 chip，兩種呈現（照 handoff §05 Calendar · Event display）：
    - 整天（allDay）：實心飽和事件色填滿 + 白字，連續 bar。
    - 定時（timed）：同色淡底 + 深一階同色字，單格 pill——不再用飽和描邊，那在密集月曆裡
      每格都拉滿音量，讀不出層級。淡底/深字都是從同一個 color prop 算出來的（見
      timedStyle 的 --chip-color 與下面的 color-mix），所以任何既有事件色都適用，
      不需要另外收斂成固定色盤。

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
    :class="edgeClass"
    :style="timedStyle"
  ><span class="pv2-chip__label">{{ title }}</span></span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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

// 整天：實心事件色填滿、白字
const allDayStyle = computed(() => ({
  background: props.color,
  color: '#fff'
}))

// 定時：淡底 + 深字，兩者都在 CSS 用 color-mix() 算，這裡只需要把原色遞進去
const timedStyle = computed(() => ({
  '--chip-color': props.color
}))
</script>

<style scoped>
.pv2-chip {
  display: flex;
  align-items: center;
  max-width: 100%;
  font: 500 10px/1.25 var(--cd-font-ui);
  letter-spacing: 0;
}

/* Hard single line, sliced at the box edge with an ellipsis rather than a bare cut —
 * a half-glyph ("BV素材準俳") reads as broken text, "…" reads as "there's more".
 *
 * This used to wrap per character (word-break: break-all) and hide everything past
 * one line-height, so a glyph that didn't fully fit moved to a hidden second line
 * rather than being cut. That never actually held: the label's box rounds up to a
 * whole pixel while the line does not, and the top of the second line bled through
 * that gap as a row of specks under the title.
 *
 * nowrap removes the second line altogether, which is the only way to guarantee the
 * bleed cannot come back at some other size. The flex parent vertically centers it so
 * top/bottom spacing is even. */
.pv2-chip__label {
  display: block;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 整天：實心色填滿 bar */
.pv2-chip--allday {
  border-radius: 6px;
  padding: 2px 4px;
}

/* 定時：同色淡底（16% 原色 + 白）+ 深字（78% 原色 + 黑），no 描邊——一片月曆裡每格都用
   飽和描邊會把音量拉到最大，這裡改用同一個 color-mix() 對任何既有事件色都成立，不需要
   額外的顏色資料或色盤收斂。 */
.pv2-chip--timed {
  border-radius: 6px;
  padding: 2px 4px;
  background: color-mix(in srgb, var(--chip-color) 16%, white);
}

.pv2-chip--timed .pv2-chip__label {
  color: color-mix(in srgb, var(--chip-color) 78%, black);
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
