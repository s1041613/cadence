import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTasksStore, mkTask } from './tasks-store'

describe('tasks-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('copyToDays', () => {
    it('copies to every date even when the slot conflicts with an existing task', () => {
      const store = useTasksStore()
      const existing = mkTask({ date: '2026-07-11', start: '14:30', end: '15:30' })
      store.tasks.push(existing)

      const source = mkTask({ date: '2026-07-10', start: '14:00', end: '15:00' })
      const created = store.copyToDays(source, ['2026-07-11', '2026-07-12', '2026-07-13'])

      expect(created).toHaveLength(3)
      expect(created.map((t) => t.date).sort()).toEqual(['2026-07-11', '2026-07-12', '2026-07-13'])
      // existing (1) + three newly created tasks
      expect(store.tasks).toHaveLength(4)
    })

    it('creates a task on every date when none conflict', () => {
      const store = useTasksStore()
      const source = mkTask({ date: '2026-07-10', start: '14:00', end: '15:00' })
      const created = store.copyToDays(source, ['2026-07-11', '2026-07-12'])

      expect(created).toHaveLength(2)
      expect(store.tasks).toHaveLength(2)
    })

    it('resets completion state on copied tasks while preserving task details', () => {
      const store = useTasksStore()
      const source = mkTask({
        date: '2026-07-10',
        title: 'Review notes',
        start: '14:00',
        end: '15:00',
        done: true,
        completedPomodoros: 2,
        estimatedPomodoros: 3,
        backgroundColor: '#c8a2c8',
        icon: 'star',
        important: true,
        urgent: true,
        notes: 'Keep this note'
      })

      const created = store.copyToDays(source, ['2026-07-11'])

      expect(created[0]).toMatchObject({
        title: 'Review notes',
        date: '2026-07-11',
        start: '14:00',
        end: '15:00',
        done: false,
        completedPomodoros: 0,
        estimatedPomodoros: 3,
        backgroundColor: '#c8a2c8',
        icon: 'star',
        important: true,
        urgent: true,
        notes: 'Keep this note'
      })
      expect(created[0]!.id).not.toBe(source.id)
    })
  })

  describe('incrementCompletedPomodoros', () => {
    it('increases the count by exactly one', () => {
      const store = useTasksStore()
      const task = mkTask({ date: '2026-07-10' })
      store.tasks.push(task)

      store.incrementCompletedPomodoros(task.id)

      expect(store.tasks[0]!.completedPomodoros).toBe(1)
    })

    it('does not increase beyond the estimated pomodoro count', () => {
      const store = useTasksStore()
      const task = mkTask({
        date: '2026-07-10',
        start: '14:00',
        end: '15:00',
        estimatedPomodoros: 2,
        completedPomodoros: 2
      })
      store.tasks.push(task)

      store.incrementCompletedPomodoros(task.id)

      expect(store.tasks[0]!.completedPomodoros).toBe(2)
    })

    it('falls back to auto pomodoro count when the estimate is invalid', () => {
      const store = useTasksStore()
      const task = mkTask({
        date: '2026-07-10',
        start: '14:00',
        end: '15:00',
        estimatedPomodoros: 0,
        completedPomodoros: 3
      })
      store.tasks.push(task)

      store.incrementCompletedPomodoros(task.id)

      expect(store.tasks[0]!.completedPomodoros).toBe(3)
    })
  })

  describe('saveTask', () => {
    it('saves successfully even when the time overlaps an existing task', () => {
      const store = useTasksStore()
      const existing = mkTask({ date: '2026-07-10', start: '14:00', end: '15:00' })
      store.tasks.push(existing)

      const incoming = mkTask({ date: '2026-07-10', start: '14:30', end: '15:30' })
      store.saveTask(incoming)

      expect(store.tasks).toHaveLength(2)
      expect(store.tasks.map((t) => t.id)).toContain(incoming.id)
    })

    it('updates an existing task in place when saving by the same id', () => {
      const store = useTasksStore()
      const task = mkTask({ date: '2026-07-10', title: 'Original' })
      store.tasks.push(task)

      store.saveTask({ ...task, title: 'Updated' })

      expect(store.tasks).toHaveLength(1)
      expect(store.tasks[0]!.title).toBe('Updated')
    })
  })
})
