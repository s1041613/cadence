import { defineBoot } from '#q-app'
import { loadStore, saveStore } from '@/utils/save-load-local-storage'
import { useTasksStore } from '@/stores/tasks-store'
import { useInboxStore } from '@/stores/inbox-store'
import type { Task } from '@/types/task'
import type { InboxItem } from '@/stores/inbox-store'

const STORAGE_KEY = 'cadence.v1'

interface PersistedShape {
  tasks: Task[]
  inbox: InboxItem[]
  inboxDraft: string
}

function isPersistedShape(value: unknown): value is PersistedShape {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<PersistedShape>
  return Array.isArray(v.tasks) && Array.isArray(v.inbox) && typeof v.inboxDraft === 'string'
}

// Sole reader/writer of the `cadence.v1` key: every other store/component must go through
// tasks-store/inbox-store rather than touching localStorage directly.
export default defineBoot(({ store }) => {
  const tasksStore = useTasksStore(store)
  const inboxStore = useInboxStore(store)

  const raw = loadStore<unknown>(STORAGE_KEY)
  if (isPersistedShape(raw)) {
    tasksStore.tasks = raw.tasks
    inboxStore.inboxItems = raw.inbox
    inboxStore.inboxDraft = raw.inboxDraft
  }
  tasksStore.isLoading = false

  function persist(): void {
    saveStore<PersistedShape>(STORAGE_KEY, {
      tasks: tasksStore.tasks,
      inbox: inboxStore.inboxItems,
      inboxDraft: inboxStore.inboxDraft
    })
  }

  // $subscribe：只要該 store 的 state 有任何變動就自動呼叫 persist()，不用在每個修改 state 的地方手動存檔
  tasksStore.$subscribe(persist)
  inboxStore.$subscribe(persist)
})
