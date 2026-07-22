import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/auth/callback', component: () => import('@/pages/AuthCallbackPage.vue') },

  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('@/pages/IndexPage.vue') }
    ],
  },

  {
    path: '/login',
    component: () => import('@/pages/LoginPage.vue'),
  },

  // Invite deep link (public — boot/auth.ts whitelists the /join/ prefix; the page itself
  // handles the signed-out branch so the token survives the login round-trip).
  {
    path: '/join/:token',
    component: () => import('@/pages/JoinCalendarPage.vue'),
  },

  // Dev-only visual verification surface (replaces Storybook). Must not exist in production builds.
  ...(import.meta.env.DEV
    ? [{ path: '/dev/gallery', component: () => import('@/pages/DevGalleryPage.vue') }]
    : []),

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
];

export default routes;
