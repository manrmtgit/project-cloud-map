import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import TabsPage from '@/views/TabsPage.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/tabs/',
    component: TabsPage,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/tabs/map'
      },
      {
        path: 'map',
        name: 'Map',
        component: () => import('@/views/MapView.vue')
      },
      {
        path: 'activities',
        name: 'Activities',
        component: () => import('@/views/ActivitiesView.vue')
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/ProfileView.vue')
      }
    ]
  },
  // Catch all pour les routes non trouvées
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Navigation guards
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  // Routes qui nécessitent l'authentification
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login');
    return;
  }

  // Routes réservées aux non-connectés (login)
  if (to.meta.requiresGuest && authStore.isLoggedIn) {
    next('/tabs/map');
    return;
  }

  next();
});

export default router;

