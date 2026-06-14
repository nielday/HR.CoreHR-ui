import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../components/layout/MainLayout.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/departments'
        },
        {
          path: 'employees',
          name: 'employees',
          component: () => import('../views/EmployeesView.vue'),
          meta: { roles: ['Admin', 'HR', 'Manager', 'Employee'] }
        },
        {
          path: 'employees/:id',
          name: 'employee-detail',
          component: () => import('../views/EmployeeDetailView.vue'),
          meta: { roles: ['Admin', 'HR', 'Manager', 'Employee'] }
        },
        {
          path: 'departments',
          name: 'departments',
          component: () => import('../views/DepartmentsView.vue'),
          meta: { roles: ['Admin', 'HR', 'Manager'] }
        },
        {
          path: 'positions',
          name: 'positions',
          component: () => import('../views/PositionsView.vue'),
          meta: { roles: ['Admin', 'HR'] }
        },
        {
          path: 'contracts',
          name: 'contracts',
          component: () => import('../views/ContractsView.vue'),
          meta: { roles: ['Admin', 'HR'] }
        },
        {
          path: 'about',
          name: 'about',
          component: () => import('../views/AboutView.vue'),
          meta: { roles: ['Admin', 'HR', 'Manager', 'Employee'] }
        }
      ]
    }
  ],
})

// Route guard for authentication and RBAC
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next('/employees')
  } else {
    // Check RBAC
    if (to.meta.roles && Array.isArray(to.meta.roles)) {
      const userRole = authStore.userRole
      if (!userRole || !to.meta.roles.includes(userRole)) {
        console.warn(`Access Denied. User Role ${userRole} is not in required roles ${to.meta.roles.join(', ')}`)
        next('/employees') // Redirect to a safe page (employees can be seen by all)
        return
      }
    }
    next()
  }
})

export default router
