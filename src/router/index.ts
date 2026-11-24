import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/calendar' },
    { path: '/calendar', name: 'calendar', component: () => import('@/views/CalendarView.vue'), meta: { title: '캘린더' } },
    { path: '/csrs', name: 'csrs', component: () => import('@/views/CsrListView.vue'), meta: { title: 'CSR 목록' } },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { title: '설정 · 공휴일' } },
  ],
})

router.afterEach((to) => {
  document.title = `${(to.meta.title as string) ?? ''} · 공수기록캘린더`
})

export default router
