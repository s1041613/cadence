import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTasksStore, mkTask } from './tasks-store'

describe('tasks-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('copyToDays', () => {
    it('copies to three days, skipping one conflict, and reports the skipped date', () => {
      const store = useTasksStore()
      const existing = mkTask({ date: '2026-07-11', start: '14:30', end: '15:30' })
      store.tasks.push(existing)

      const source = mkTask({ date: '2026-07-10', start: '14:00', end: '15:00' })
      const { created, skipped } = store.copyToDays(source, ['2026-07-11', '2026-07-12', '2026-07-13'])

      expect(created).toHaveLength(2)
      expect(created.map((t) => t.date).sort()).toEqual(['2026-07-12', '2026-07-13'])
      expect(skipped).toEqual(['2026-07-11'])
      // existing (1) + two newly created tasks
      expect(store.tasks).toHaveLength(3)
    })

    it('creates a task on every date when none conflict', () => {
      const store = useTasksStore()
      const source = mkTask({ date: '2026-07-10', start: '14:00', end: '15:00' })
      const { created, skipped } = store.copyToDays(source, ['2026-07-11', '2026-07-12'])

      expect(created).toHaveLength(2)
      expect(skipped).toEqual([])
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
        texture: 'dot',
        icon: 'bolt',
        important: true,
        urgent: true,
        notes: 'Keep this note'
      })

      const { created } = store.copyToDays(source, ['2026-07-11'])

      expect(created[0]).toMatchObject({
        title: 'Review notes',
        date: '2026-07-11',
        start: '14:00',
        end: '15:00',
        done: false,
        completedPomodoros: 0,
        estimatedPomodoros: 3,
        backgroundColor: '#c8a2c8',
        texture: 'dot',
        icon: 'bolt',
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
    it('blocks saving and returns the conflicting task without closing the caller', () => {
      const store = useTasksStore()
      const existing = mkTask({ date: '2026-07-10', start: '14:00', end: '15:00' })
      store.tasks.push(existing)

      const incoming = mkTask({ date: '2026-07-10', start: '14:30', end: '15:30' })
      const conflict = store.saveTask(incoming)

      expect(conflict?.id).toBe(existing.id)
      expect(store.tasks).toHaveLength(1)
    })
  })
})
