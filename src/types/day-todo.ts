/** One line on a day's rough to-do list. Untimed by definition: once it gets a time it is
 *  scheduled into a task and leaves this list (see the day_todos migration). */
export interface DayTodo {
  id: string
  /** 'YYYY-MM-DD'. The day whose list it is on now — moves forward when carried over. */
  date: string
  /** 'YYYY-MM-DD'. The day it was first written. Differs from `date` once carried. */
  originDate: string
  title: string
  done: boolean
  /** Insertion order within a day. Not user-reorderable. */
  position: number
}
