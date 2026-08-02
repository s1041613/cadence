/** A checklist item belonging to a task. Deliberately three meaningful fields and a parent:
 *  no duration, no pomodoro count, no share of the estimate. Pomodoros are credited to the
 *  parent task — subtasks are a checklist, not timers. */
export interface Subtask {
  id: string
  parentId: string
  title: string
  done: boolean
  /** Insertion order within the parent. Not user-reorderable: completed subtasks stay put. */
  position: number
}
