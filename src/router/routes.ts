import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/auth/callback', component: () => import('@/pages/AuthCallbackPage.vue') },

  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/v2/month' },
      { path: 'legacy', component: () => import('@/pages/IndexPage.vue') },
      // v2 月曆頁：全新外觀、重用既有邏輯層。借 MainLayout 的 100dvh sizing（無外觀）。
      { path: 'v2/month', component: () => import('@/pages/MonthPageV2.vue') },
      { path: 'v2/week', component: () => import('@/pages/WeekPageV2.vue') },
      { path: 'v2/day', component: () => import('@/pages/DayPageV2.vue') },
      { path: 'v2/settings', component: () => import('@/pages/SettingsPageV2.vue') },
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
