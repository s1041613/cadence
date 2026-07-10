import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('@/pages/IndexPage.vue') }
    ],
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
