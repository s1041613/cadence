import type { PopoverAnchor } from '@/components/ui/CdPopover.vue'

// Builds a PopoverAnchor from a click event, relative to the nearest `[data-poster-root]`
// ancestor — the positioning root CdPopover expects (see CdPopover.vue's header comment).
export function anchorFromEvent(e: MouseEvent): PopoverAnchor {
  const target = e.currentTarget as HTMLElement
  const root = target.closest('[data-poster-root]') as HTMLElement | null
  const targetRect = target.getBoundingClientRect()
  const rootRect = (root ?? target).getBoundingClientRect()
  return {
    x: targetRect.left - rootRect.left,
    y: targetRect.top - rootRect.top,
    w: targetRect.width,
    h: targetRect.height,
    rw: rootRect.width,
    rh: rootRect.height
  }
}
