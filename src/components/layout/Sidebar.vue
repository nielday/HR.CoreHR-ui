<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronDownIcon } from 'lucide-vue-next'
import { useAuthStore } from '../../stores/auth'
import { useAttendanceStore } from '../../stores/attendance'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])

const authStore = useAuthStore()
const route = useRoute()

const drawer = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const userRole = computed(() => authStore.userRole)
const roleLabel = computed(() => {
  const map: Record<string, string> = { Admin: 'Quản trị viên', HR: 'Nhân sự', Manager: 'Quản lý', Employee: 'Nhân viên' }
  return map[userRole.value || ''] || userRole.value || ''
})

const canManageSystem = computed(() => ['Admin', 'HR'].includes(userRole.value || ''))
const canViewAll = computed(() => ['Admin', 'HR', 'Manager'].includes(userRole.value || ''))

// Badge "việc cần xử lý": số đơn nghỉ phép đang chờ duyệt
const attStore = useAttendanceStore()
const pendingLeaveCount = computed(() => attStore.pendingLeaves.length)
onMounted(() => {
  if (canViewAll.value) attStore.fetchPendingLeaves()
})

// Trang tổng quan theo vai trò
const dashboardPath = computed(() => {
  if (userRole.value === 'Employee') return '/me/dashboard'
  if (userRole.value === 'Manager') return '/manager/dashboard'
  return '/dashboard'
})

// ===== Cấu trúc menu ĐA CẤP =====
interface MenuChild { label: string; to: string; show: boolean; badge?: number }
interface MenuGroup { key: string; label: string; children: MenuChild[] }

const menu = computed<MenuGroup[]>(() => {
  const sys = canManageSystem.value
  const viewAll = canViewAll.value
  const adm = userRole.value === 'Admin' // quản trị hệ thống: chỉ Admin

  const groups: MenuGroup[] = [
    {
      key: 'hr',
      label: 'Nhân sự',
      children: [
        { label: 'Nhân viên', to: '/employees', show: true },
        { label: 'Phòng ban', to: '/departments', show: viewAll },
        { label: 'Chức vụ', to: '/positions', show: sys },
        { label: 'Loại hợp đồng', to: '/contracts', show: sys },
        { label: 'Hợp đồng của tôi', to: '/my/contracts', show: true },
      ],
    },
    {
      key: 'attendance',
      label: 'Chấm công',
      children: [
        { label: 'Chấm công của tôi', to: '/attendance/me', show: true },
        { label: 'Bảng chấm công', to: '/attendance/records', show: viewAll },
        { label: 'Ca làm việc', to: '/attendance/shifts', show: sys },
        { label: 'Quản lý Kiosk', to: '/attendance/kiosk', show: adm },
        { label: 'Chốt công', to: '/attendance/closing', show: sys },
      ],
    },
    {
      key: 'leave',
      label: 'Nghỉ phép',
      children: [
        { label: 'Đơn nghỉ phép', to: '/attendance/leave', show: true },
        { label: 'Duyệt nghỉ phép', to: '/attendance/leave-approval', show: viewAll, badge: pendingLeaveCount.value },
        { label: 'Cấu hình nghỉ phép', to: '/attendance/leave-policies', show: sys },
      ],
    },
    {
      key: 'payroll',
      label: 'Lương',
      children: [
        { label: 'Bảng lương của tôi', to: '/my/payslip', show: true },
        { label: 'Dashboard lương', to: '/payroll/dashboard', show: sys },
        { label: 'Bảng lương', to: '/payroll/records', show: sys },
        { label: 'Cấu hình lương', to: '/payroll/salary-config', show: sys },
      ],
    },
    {
      key: 'admin',
      label: 'Quản trị',
      children: [
        { label: 'Tài khoản & Phân quyền', to: '/users', show: adm },
      ],
    },
  ]

  return groups
    .map((g) => ({ ...g, children: g.children.filter((c) => c.show) }))
    .filter((g) => g.children.length > 0)
})

// ===== Đóng/mở nhóm =====
const openKeys = ref<string[]>([])
const isOpen = (key: string) => openKeys.value.includes(key)
function toggle(key: string) {
  const i = openKeys.value.indexOf(key)
  if (i === -1) openKeys.value.push(key)
  else openKeys.value.splice(i, 1)
}
const groupBadge = (g: MenuGroup) => g.children.reduce((s, c) => s + (c.badge || 0), 0)

// Tự mở nhóm chứa route hiện tại
function isChildActive(to: string) {
  return route.path === to || route.path.startsWith(to + '/')
}
watch(
  () => [route.path, menu.value] as const,
  () => {
    const g = menu.value.find((grp) => grp.children.some((c) => isChildActive(c.to)))
    if (g && !openKeys.value.includes(g.key)) openKeys.value.push(g.key)
  },
  { immediate: true },
)
</script>

<template>
  <v-navigation-drawer v-model="drawer" border="right" elevation="0" class="bg-foreground text-white/70 border-r border-border/10" :width="280">
    <div class="h-full flex flex-col relative overflow-hidden bg-foreground">
      <!-- Background Texture -->
      <div class="absolute inset-0 texture-dots opacity-5 pointer-events-none"></div>

      <!-- Logo -->
      <div class="h-20 px-6 flex items-center gap-3 border-b border-white/5 flex-shrink-0 relative z-10">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-secondary flex items-center justify-center shadow-accent">
          <span class="font-display font-bold text-white text-lg">HR</span>
        </div>
        <div>
          <h1 class="font-display text-xl text-white tracking-tight leading-tight">Core</h1>
          <p class="font-mono text-[10px] uppercase tracking-widest text-accent-secondary">Doanh nghiệp</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav flex-1 px-3 py-5 space-y-1 relative z-10 overflow-y-auto custom-scrollbar">
        <!-- Tổng quan (cấp 1) -->
        <RouterLink :to="dashboardPath" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm">
          <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
          <span class="font-sans font-medium text-sm">Tổng quan</span>
        </RouterLink>

        <!-- Các nhóm đa cấp -->
        <div v-for="g in menu" :key="g.key" class="pt-1">
          <button
            type="button"
            @click="toggle(g.key)"
            class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-200"
            :class="isOpen(g.key) ? 'text-white' : 'text-white/90 hover:text-white'"
          >
            <span class="font-sans font-medium text-sm">{{ g.label }}</span>
            <span v-if="!isOpen(g.key) && groupBadge(g) > 0" class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold">{{ groupBadge(g) }}</span>
            <ChevronDownIcon class="w-4 h-4 ml-auto transition-transform duration-200" :class="isOpen(g.key) ? 'rotate-180 text-white/80' : 'text-white/45'" />
          </button>

          <transition name="submenu">
            <div v-show="isOpen(g.key)" class="ml-4 mt-1 pl-2 border-l border-white/10 space-y-0.5">
              <RouterLink
                v-for="c in g.children"
                :key="c.to"
                :to="c.to"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-white/85 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                active-class="!text-white bg-white/10"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-accent/60 transition-colors shrink-0"></span>
                <span class="font-sans font-medium text-sm">{{ c.label }}</span>
                <span v-if="c.badge && c.badge > 0" class="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold">{{ c.badge }}</span>
              </RouterLink>
            </div>
          </transition>
        </div>
      </nav>

      <!-- Bottom User Profile -->
      <div class="p-4 border-t border-white/5 bg-foreground/50 backdrop-blur-sm relative z-10">
        <RouterLink to="/profile" class="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5" active-class="!bg-white/10" title="Hồ sơ của tôi">
          <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-accent to-accent-secondary p-[2px]">
            <div class="w-full h-full rounded-full border border-background overflow-hidden bg-white">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="User" class="w-full h-full object-cover" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ roleLabel }}</p>
            <p class="text-xs text-muted-foreground truncate">Hồ sơ của tôi ›</p>
          </div>
        </RouterLink>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<style scoped>
.texture-dots {
  background-image: radial-gradient(circle, white 1px, transparent 1px);
  background-size: 32px 32px;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
a.router-link-exact-active > span:first-child {
  background-color: var(--accent, #0052FF) !important;
  box-shadow: 0 0 8px var(--accent, #0052FF);
}

/* Ép màu chữ menu sáng — đè màu tối mặc định của Vuetify navigation-drawer */
nav.sidebar-nav a,
nav.sidebar-nav button {
  color: rgba(255, 255, 255, 0.92) !important;
}
nav.sidebar-nav a:hover,
nav.sidebar-nav button:hover {
  color: #ffffff !important;
}

/* Hiệu ứng xổ/thu submenu */
.submenu-enter-active,
.submenu-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.submenu-enter-from,
.submenu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
