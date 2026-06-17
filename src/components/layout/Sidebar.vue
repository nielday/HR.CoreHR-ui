<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const authStore = useAuthStore()

const drawer = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const userRole = computed(() => authStore.userRole)

// Tên vai trò hiển thị bằng tiếng Việt (giá trị gốc Admin/HR/Manager/Employee vẫn dùng cho logic)
const roleLabel = computed(() => {
  const map: Record<string, string> = { Admin: 'Quản trị viên', HR: 'Nhân sự', Manager: 'Quản lý', Employee: 'Nhân viên' }
  return map[userRole.value || ''] || userRole.value || ''
})

// Determine visibility of menus based on role
const canManageSystem = computed(() => ['Admin', 'HR'].includes(userRole.value || ''))
const canViewAll = computed(() => ['Admin', 'HR', 'Manager'].includes(userRole.value || ''))
const isEmployee = computed(() => userRole.value === 'Employee')
const isManager = computed(() => userRole.value === 'Manager')
</script>

<template>
  <v-navigation-drawer v-model="drawer" border="right" elevation="0" class="bg-foreground text-white/70 border-r border-border/10" :width="280">
    <div class="h-full flex flex-col relative overflow-hidden bg-foreground">
      
      <!-- Background Texture (Dot pattern for dark sections) -->
      <div class="absolute inset-0 texture-dots opacity-5 pointer-events-none"></div>

      <!-- Logo Section -->
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
      <nav class="flex-1 px-4 py-6 space-y-1 relative z-10 overflow-y-auto custom-scrollbar">
        <div class="px-4 mb-2 mt-2">
          <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Tổng quan</span>
        </div>

        <RouterLink v-if="isEmployee" to="/me/dashboard" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
          <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
          <span class="font-sans font-medium text-sm">Tổng quan</span>
        </RouterLink>

        <RouterLink v-if="isManager" to="/manager/dashboard" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
          <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
          <span class="font-sans font-medium text-sm">Tổng quan</span>
        </RouterLink>

        <RouterLink v-if="canManageSystem" to="/dashboard" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
          <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
          <span class="font-sans font-medium text-sm">Dashboard</span>
        </RouterLink>

        <div class="px-4 mb-2 mt-8">
          <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Nhân sự</span>
        </div>

        <RouterLink to="/employees" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
          <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
          <span class="font-sans font-medium text-sm">Nhân viên</span>
        </RouterLink>

        <RouterLink to="/my/contracts" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
          <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
          <span class="font-sans font-medium text-sm">Hợp đồng của tôi</span>
        </RouterLink>

        <template v-if="canViewAll">
          <RouterLink to="/departments" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
            <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
            <span class="font-sans font-medium text-sm">Phòng ban</span>
          </RouterLink>
        </template>

        <template v-if="canManageSystem">
          <RouterLink to="/positions" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
            <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
            <span class="font-sans font-medium text-sm">Chức vụ</span>
          </RouterLink>

          <RouterLink to="/contracts" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
            <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
            <span class="font-sans font-medium text-sm">Loại hợp đồng</span>
          </RouterLink>
        </template>

        <!-- Attendance -->
        <div class="px-4 mb-2 mt-8">
          <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Chấm công</span>
        </div>

        <RouterLink to="/attendance/me" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
          <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
          <span class="font-sans font-medium text-sm">Chấm công của tôi</span>
        </RouterLink>

        <template v-if="canViewAll">
          <RouterLink to="/attendance/records" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
            <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
            <span class="font-sans font-medium text-sm">Bảng chấm công</span>
          </RouterLink>

        </template>

        <template v-if="canManageSystem">
          <RouterLink to="/attendance/shifts" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
            <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
            <span class="font-sans font-medium text-sm">Ca làm việc</span>
          </RouterLink>

          <RouterLink to="/attendance/kiosk" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
            <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
            <span class="font-sans font-medium text-sm">Quản lý Kiosk</span>
          </RouterLink>

          <RouterLink to="/attendance/closing" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
            <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
            <span class="font-sans font-medium text-sm">Chốt công</span>
          </RouterLink>
        </template>

        <!-- Leave -->
        <div class="px-4 mb-2 mt-8">
          <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Nghỉ phép</span>
        </div>

        <RouterLink to="/attendance/leave" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
          <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
          <span class="font-sans font-medium text-sm">Đơn nghỉ phép</span>
        </RouterLink>

        <template v-if="canViewAll">
          <RouterLink to="/attendance/leave-approval" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
            <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
            <span class="font-sans font-medium text-sm">Duyệt nghỉ phép</span>
          </RouterLink>
        </template>

        <template v-if="canManageSystem">
          <RouterLink to="/attendance/leave-policies" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
            <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
            <span class="font-sans font-medium text-sm">Cấu hình nghỉ phép</span>
          </RouterLink>
        </template>

        <!-- Payroll (Nhóm 3) -->
        <div class="px-4 mb-2 mt-8">
          <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Lương</span>
        </div>

        <RouterLink to="/my/payslip" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
          <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
          <span class="font-sans font-medium text-sm">Bảng lương của tôi</span>
        </RouterLink>

        <template v-if="canManageSystem">
          <RouterLink to="/payroll/dashboard" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
            <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
            <span class="font-sans font-medium text-sm">Dashboard lương</span>
          </RouterLink>

          <template v-if="canManageSystem">
            <RouterLink to="/payroll/records" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
              <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
              <span class="font-sans font-medium text-sm">Bảng lương</span>
            </RouterLink>

            <RouterLink to="/payroll/salary-config" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
              <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
              <span class="font-sans font-medium text-sm">Cấu hình lương</span>
            </RouterLink>
          </template>
        </template>

        <template v-if="canManageSystem">
          <div class="px-4 mb-2 mt-8">
            <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Quản trị</span>
          </div>

          <RouterLink to="/users" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
            <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
            <span class="font-sans font-medium text-sm">Tài khoản</span>
          </RouterLink>

          <RouterLink to="/permissions" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
            <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
            <span class="font-sans font-medium text-sm">Vai trò & phân quyền</span>
          </RouterLink>
        </template>
      </nav>

      <!-- Bottom User Profile Section -->
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
</style>
