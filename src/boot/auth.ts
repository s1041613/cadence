import { defineBoot } from '#q-app'
import { useAuthStore } from '@/stores/auth-store'

const PUBLIC_ROUTES = new Set(['/auth/callback', '/login'])

export default defineBoot(async ({ router, store }) => {
  const auth = useAuthStore(store)
  await auth.init()

  router.beforeEach((to) => {
    if (to.path === '/login' && auth.isSignedIn) return '/'
    if (PUBLIC_ROUTES.has(to.path)) return true
    if (!auth.isSignedIn) return { path: '/login' }
    return true
  })
})
