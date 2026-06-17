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
      // Kiosk chấm công CÔNG KHAI — không cần đăng nhập, toàn màn hình.
      path: '/kiosk',
      name: 'public-kiosk',
      component: () => import('../views/PublicKioskView.vue'),
      meta: { public: true },
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: () => import('../views/ChangePasswordView.vue'),
    },
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          // Trang chủ theo vai trò: nhân viên → tổng quan cá nhân; quản lý → dashboard phòng ban; HR/Admin → dashboard quản trị
          redirect: () => {
            const auth = useAuthStore()
            if (auth.userRole === 'Employee') return '/me/dashboard'
            if (auth.userRole === 'Manager') return '/manager/dashboard'
            return '/dashboard'
          }
        },
        {
          path: 'me/dashboard',
          name: 'my-dashboard',
          component: () => import('../views/MyDashboardView.vue'),
          meta: { roles: ['Admin', 'HR', 'Manager', 'Employee'] }
        },
        {
          path: 'manager/dashboard',
          name: 'manager-dashboard',
          component: () => import('../views/ManagerDashboardView.vue'),
          meta: { roles: ['Manager'] }
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('../views/PayrollDashboardView.vue'),
          meta: { roles: ['Admin', 'HR'] }
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
          meta: { roles: ['Admin', 'HR', 'Manager'], fullWidth: true }
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
          path: 'payroll/dashboard',
          name: 'payroll-dashboard',
          component: () => import('../views/PayrollDashboardView.vue'),
          meta: { roles: ['Admin', 'HR'] }
        },
        {
          path: 'payroll/records',
          name: 'payroll-records',
          component: () => import('../views/PayrollsView.vue'),
          meta: { roles: ['Admin', 'HR'] }
        },
        {
          path: 'payroll/salary-config',
          name: 'payroll-salary-config',
          component: () => import('../views/SalaryConfigView.vue'),
          meta: { roles: ['Admin', 'HR'] }
        },
        {
          path: 'attendance/me',
          name: 'attendance-me',
          component: () => import('../views/MyAttendanceView.vue'),
          meta: { roles: ['Admin', 'HR', 'Manager', 'Employee'] }
        },
        {
          path: 'attendance/leave',
          name: 'attendance-leave',
          component: () => import('../views/MyLeaveView.vue'),
          meta: { roles: ['Admin', 'HR', 'Manager', 'Employee'] }
        },
        {
          path: 'attendance/leave-approval',
          name: 'attendance-leave-approval',
          component: () => import('../views/LeaveApprovalView.vue'),
          meta: { roles: ['Admin', 'HR', 'Manager'] }
        },
        {
          path: 'attendance/records',
          name: 'attendance-records',
          component: () => import('../views/AttendanceRecordsView.vue'),
          meta: { roles: ['Admin', 'HR', 'Manager'] }
        },
        {
          path: 'attendance/shifts',
          name: 'attendance-shifts',
          component: () => import('../views/ShiftsView.vue'),
          meta: { roles: ['Admin', 'HR'] }
        },
        {
          path: 'attendance/kiosk',
          name: 'attendance-kiosk',
          component: () => import('../views/KioskView.vue'),
          meta: { roles: ['Admin', 'HR'] }
        },
        {
          path: 'attendance/leave-policies',
          name: 'attendance-leave-policies',
          component: () => import('../views/LeavePoliciesView.vue'),
          meta: { roles: ['Admin', 'HR'] }
        },
        {
          path: 'attendance/closing',
          name: 'attendance-closing',
          component: () => import('../views/AttendanceClosingView.vue'),
          meta: { roles: ['Admin', 'HR'] }
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('../views/UsersView.vue'),
          meta: { roles: ['Admin', 'HR'] }
        },
        {
          path: 'permissions',
          name: 'permissions',
          component: () => import('../views/UsersView.vue'),
          meta: { roles: ['Admin', 'HR'] }
        },
        {
          path: 'my/contracts',
          name: 'my-contracts',
          component: () => import('../views/MyContractsView.vue'),
          meta: { roles: ['Admin', 'HR', 'Manager', 'Employee'] }
        },
        {
          path: 'my/payslip',
          name: 'my-payslip',
          component: () => import('../views/MyPayslipView.vue'),
          meta: { roles: ['Admin', 'HR', 'Manager', 'Employee'] }
        },
        {
          path: 'profile',
          name: 'my-profile',
          component: () => import('../views/MyProfileView.vue'),
          meta: { roles: ['Admin', 'HR', 'Manager', 'Employee'] }
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

// Route guard: xác thực, buộc đổi mật khẩu lần đầu, và RBAC
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const authed = authStore.isAuthenticated

  // Trang công khai (Kiosk) — không cần đăng nhập
  if (to.meta.public) return next()

  // Chưa đăng nhập → mặc định hiện màn hình Kiosk công cộng (trừ khi vào thẳng /login)
  if (!authed) {
    if (to.path === '/login') return next()
    return next('/kiosk')
  }

  // Đã đăng nhập nhưng buộc đổi mật khẩu lần đầu → ép về trang đổi mật khẩu
  if (authStore.mustChangePassword && to.path !== '/change-password') {
    return next('/change-password')
  }
  // Đã đổi xong rồi mà còn ở trang đổi/login → đưa về trang chính (redirect '/' tự phân theo vai trò)
  if (!authStore.mustChangePassword && (to.path === '/change-password' || to.path === '/login')) {
    return next('/')
  }

  // RBAC
  if (to.meta.roles && Array.isArray(to.meta.roles)) {
    const userRole = authStore.userRole
    if (!userRole || !to.meta.roles.includes(userRole)) {
      console.warn(`Access Denied. User Role ${userRole} is not in required roles ${to.meta.roles.join(', ')}`)
      return next('/')
    }
  }
  next()
})

export default router
