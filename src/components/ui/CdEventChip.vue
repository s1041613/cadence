<template>
  <div
    class="cd-event-chip"
    :class="{ 'cd-event-chip--solid': solid, 'cd-event-chip--done': done }"
    :style="chipStyle"
    @click="emit('click', $event)"
  >
    <template v-if="fmt === 'dot'">
      <span class="cd-event-chip__dot" :style="{ background: color }" />
    </template>
    <template v-else-if="fmt === 'icon'">
      <span class="cd-event-chip__mini-icon" :style="quadIconStyle" aria-hidden="true" />
      <span class="cd-event-chip__label">{{ title }}</span>
    </template>
    <template v-else>
      <span class="cd-event-chip__label">{{ title }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { QUAD_ICON_SRC } from './icons'

// CdEventChip — month cell event chip. design-research-report.md §3.5:
//  - fmt='name'/'icon': font 600 9.5px Zen Kaku; radius 6px; padding 1px 5px; border 1px solid quadColor.
//  - all-day = solid fill (bg=color, text=white); timed = outline (border+text=color, transparent bg).
//  - done: line-through + opacity .5.
//  - fmt='name': title only (no icon — maximizes text room in narrow phone cells).
//  - fmt='icon': 10px quadrant mini-icon (do=check, plan=flag, quick=bolt, later=moon, event=star) + title.
//  - fmt='dot': cell shows only a 5px colored dot (max 4 per cell, enforced by the parent CdMonthCell).
// Mini-icons are CSS-masked from public/icons files (QUAD_ICON_SRC) so they take the chip's text
// color, same as the old inline v-html `stroke="currentColor"` glyphs did.

const props = defineProps<{
  title: string
  color: string
  quad: 'do' | 'plan' | 'quick' | 'later' | 'event'
  time: string | null // null = all-day
  endTime: string | null
  allDay: boolean
  done: boolean
  fmt: 'name' | 'icon' | 'dot'
}>()

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const solid = computed(() => props.allDay)

const quadIconStyle = computed(() => {
  const src = QUAD_ICON_SRC[props.quad] ?? QUAD_ICON_SRC.event
  const tint = solid.value ? '#fff' : props.color
  return {
    width: '10px',
    height: '10px',
    backgroundColor: tint,
    maskImage: `url(${src})`,
    WebkitMaskImage: `url(${src})`,
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%'
  }
})

const chipStyle = computed(() => ({
  background: props.fmt === 'dot' ? 'transparent' : solid.value ? props.color : 'transparent',
  color: props.fmt === 'dot' ? undefined : solid.value ? '#fff' : props.color,
  border: props.fmt === 'dot' ? 'none' : `1px solid ${props.color}`,
  fontFamily: 'var(--cd-font-title)'
}))
</script>

<style scoped>
.cd-event-chip {
  cursor: pointer;
  flex: none;
  align-self: stretch;
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 9.5px;
  font-weight: 600;
  line-height: 1.3;
  border-radius: var(--cd-radius-xs);
  padding: 1px 5px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

@media (max-width: 899px) {
  .cd-event-chip {
    /* Fixed 15px chip height keeps CdMonthGrid's maxChips row math exact on phones; tighter
       side padding leaves more of the ~50px-wide cell to the title text. */
    padding: 1px 3px;
    height: 15px;
    box-sizing: border-box;
  }
}

.cd-event-chip--done {
  text-decoration: line-through;
  opacity: 0.5;
}

.cd-event-chip__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex: none;
}

.cd-event-chip__mini-icon {
  display: flex;
  flex: none;
}

.cd-event-chip__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
