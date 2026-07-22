import { defineBoot } from '#q-app'
import { useAuthStore } from '@/stores/auth-store'

const PUBLIC_ROUTES = new Set(['/auth/callback', '/login'])

export default defineBoot(async ({ router, store }) => {
  const auth = useAuthStore(store)
  await auth.init()

  router.beforeEach((to) => {
    if (to.path === '/login' && auth.isSignedIn) return '/'
    if (PUBLIC_ROUTES.has(to.path)) return true
    // /join/<token> is public: the page handles the signed-out branch itself (saving the token
    // destination before redirecting to login), which a blanket guard redirect would lose.
    if (to.path.startsWith('/join/')) return true
    if (!auth.isSignedIn) return { path: '/login' }
    return true
  })
})
