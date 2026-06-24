<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { SearchIcon, UserIcon, Building2Icon, BriefcaseIcon, CompassIcon, ClockIcon, BanknoteIcon, XIcon } from 'lucide-vue-next'
import { useAuthStore } from '../../stores/auth'
import { useEmployeeStore } from '../../stores/employee'
import { useDepartmentStore } from '../../stores/department'
import { usePositionStore } from '../../stores/position'

const router = useRouter()
const auth = useAuthStore()
const empStore = useEmployeeStore()
const deptStore = useDepartmentStore()
const posStore = usePositionStore()

const role = computed(() => auth.userRole || '')
const canSeeDepartments = computed(() => ['Admin', 'HR', 'Manager'].includes(role.value))
const canSeePositions = computed(() => ['Admin', 'HR'].includes(role.value))
const canSeeAttendanceTable = computed(() => ['Admin', 'HR', 'Manager'].includes(role.value))
const canSeePayrollTable = computed(() => ['Admin', 'HR'].includes(role.value))
// Chip "Lương": Admin/HR mở bảng lương, Employee mở phiếu của mình; Manager không có quyền xem lương → ẩn
const canQuickPayroll = computed(() => canSeePayrollTable.value || role.value === 'Employee')

// Bỏ dấu tiếng Việt + thường hóa để so khớp ("nguyen" khớp "Nguyễn")
function norm(s: unknown) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

// ===== Danh sách trang (điều hướng nhanh), lọc theo vai trò qua router meta =====
interface PageItem { label: string; path: string; roles: string[]; kw: string }
const PAGES: PageItem[] = [
  { label: 'Tổng quan (Quản trị)', path: '/dashboard', roles: ['Admin', 'HR'], kw: 'dashboard tong quan admin' },
  { label: 'Dashboard phòng ban', path: '/manager/dashboard', roles: ['Manager'], kw: 'quan ly phong ban manager' },
  { label: 'Tổng quan của tôi', path: '/me/dashboard', roles: ['Admin', 'HR', 'Manager', 'Employee'], kw: 'ca nhan tong quan' },
  { label: 'Nhân viên', path: '/employees', roles: ['Admin', 'HR', 'Manager', 'Employee'], kw: 'nhan vien employees' },
  { label: 'Phòng ban', path: '/departments', roles: ['Admin', 'HR', 'Manager'], kw: 'phong ban departments co cau' },
  { label: 'Chức vụ', path: '/positions', roles: ['Admin', 'HR'], kw: 'chuc vu positions' },
  { label: 'Hợp đồng', path: '/contracts', roles: ['Admin', 'HR'], kw: 'hop dong contracts' },
  { label: 'Bảng lương', path: '/payroll/records', roles: ['Admin', 'HR'], kw: 'bang luong payroll' },
  { label: 'Dashboard lương', path: '/payroll/dashboard', roles: ['Admin', 'HR'], kw: 'dashboard luong bao cao' },
  { label: 'Cấu hình lương', path: '/payroll/salary-config', roles: ['Admin', 'HR'], kw: 'cau hinh luong salary config' },
  { label: 'Chấm công của tôi', path: '/attendance/me', roles: ['Admin', 'HR', 'Manager', 'Employee'], kw: 'cham cong ca nhan' },
  { label: 'Bảng chấm công', path: '/attendance/records', roles: ['Admin', 'HR', 'Manager'], kw: 'bang cham cong attendance' },
  { label: 'Nghỉ phép của tôi', path: '/attendance/leave', roles: ['Admin', 'HR', 'Manager', 'Employee'], kw: 'nghi phep leave don' },
  { label: 'Duyệt nghỉ phép', path: '/attendance/leave-approval', roles: ['Admin', 'HR', 'Manager'], kw: 'duyet nghi phep approval' },
  { label: 'Ca làm việc', path: '/attendance/shifts', roles: ['Admin', 'HR'], kw: 'ca lam viec shifts' },
  { label: 'Chốt công', path: '/attendance/closing', roles: ['Admin', 'HR'], kw: 'chot cong closing' },
  { label: 'Cấu hình nghỉ phép', path: '/attendance/leave-policies', roles: ['Admin', 'HR'], kw: 'cau hinh nghi phep policies' },
  { label: 'Quản lý Kiosk', path: '/attendance/kiosk', roles: ['Admin'], kw: 'kiosk cham cong' },
  { label: 'Người dùng', path: '/users', roles: ['Admin'], kw: 'nguoi dung users tai khoan' },
  { label: 'Hợp đồng của tôi', path: '/my/contracts', roles: ['Admin', 'HR', 'Manager', 'Employee'], kw: 'hop dong cua toi' },
  { label: 'Phiếu lương của tôi', path: '/my/payslip', roles: ['Admin', 'HR', 'Manager', 'Employee'], kw: 'phieu luong payslip' },
  { label: 'Hồ sơ cá nhân', path: '/profile', roles: ['Admin', 'HR', 'Manager', 'Employee'], kw: 'ho so profile ca nhan' },
]
const allowedPages = computed(() => PAGES.filter((p) => p.roles.includes(role.value)))

// ===== State =====
const open = ref(false)
const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const rootRef = ref<HTMLElement | null>(null)
const activeIndex = ref(0)
const dataLoaded = ref(false)

async function ensureData() {
  if (dataLoaded.value) return
  dataLoaded.value = true
  await empStore.fetchAllEmployees()
  if (canSeeDepartments.value) deptStore.fetchDepartments()
  if (canSeePositions.value) posStore.fetchPositions()
}

const LIMIT_EMP = 6
const LIMIT_OTHER = 4
const LIMIT_PAGE = 5

const empResults = computed(() => {
  const q = norm(query.value)
  if (!q) return []
  return (empStore.allEmployees as any[])
    .filter((e) => norm(`${e.fullName} ${e.employeeCode} ${e.departmentName} ${e.positionName}`).includes(q))
    .slice(0, LIMIT_EMP)
})
const deptResults = computed(() => {
  const q = norm(query.value)
  if (!q || !canSeeDepartments.value) return []
  return (deptStore.departments as any[])
    .filter((d) => norm(`${d.departmentName} ${d.departmentCode}`).includes(q))
    .slice(0, LIMIT_OTHER)
})
const posResults = computed(() => {
  const q = norm(query.value)
  if (!q || !canSeePositions.value) return []
  return (posStore.positions as any[])
    .filter((p) => norm(`${p.positionName} ${p.positionCode}`).includes(q))
    .slice(0, LIMIT_OTHER)
})
const pageResults = computed(() => {
  const q = norm(query.value)
  if (!q) return []
  return allowedPages.value
    .filter((p) => norm(p.label).includes(q) || p.kw.includes(q))
    .slice(0, LIMIT_PAGE)
})

const totalCount = computed(() => empResults.value.length + deptResults.value.length + posResults.value.length + pageResults.value.length)

// Danh sách phẳng cho điều hướng bàn phím (chỉ hành động CHÍNH của mỗi dòng)
const flatItems = computed<Array<() => void>>(() => {
  const items: Array<() => void> = []
  for (const e of empResults.value) items.push(() => goEmployee(e))
  for (const d of deptResults.value) items.push(() => goAndClose('/departments'))
  for (const p of posResults.value) items.push(() => goAndClose('/positions'))
  for (const pg of pageResults.value) items.push(() => goAndClose(pg.path))
  return items
})

function clampActive() {
  if (activeIndex.value >= flatItems.value.length) activeIndex.value = Math.max(0, flatItems.value.length - 1)
}

// ===== Điều hướng =====
function goAndClose(path: string) {
  router.push(path)
  close()
}
function goEmployee(e: any) {
  if (e?.id) goAndClose(`/employees/${e.id}`)
}
function goAttendance(e: any) {
  if (canSeeAttendanceTable.value && e?.id) goAndClose(`/attendance/records?employeeId=${e.id}`)
  else goAndClose('/attendance/me')
}
function goPayroll(e: any) {
  if (canSeePayrollTable.value && e?.id) goAndClose(`/payroll/records?employeeId=${e.id}`)
  else goAndClose('/my/payslip')
}

// ===== Mở/đóng + bàn phím =====
async function focusOpen() {
  open.value = true
  await ensureData()
}
function close() {
  open.value = false
  query.value = ''
  activeIndex.value = 0
  inputRef.value?.blur()
}
function onInput() {
  activeIndex.value = 0
  if (!open.value) open.value = true
}
function onKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Escape') { close(); return }
  if (!open.value) return
  if (ev.key === 'ArrowDown') {
    ev.preventDefault()
    if (flatItems.value.length) activeIndex.value = (activeIndex.value + 1) % flatItems.value.length
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault()
    if (flatItems.value.length) activeIndex.value = (activeIndex.value - 1 + flatItems.value.length) % flatItems.value.length
  } else if (ev.key === 'Enter') {
    clampActive()
    flatItems.value[activeIndex.value]?.()
  }
}

function onDocMouseDown(ev: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(ev.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocMouseDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocMouseDown))

// Chỉ số phẳng (để tô sáng dòng đang chọn theo nhóm)
const empOffset = 0
const deptOffset = computed(() => empResults.value.length)
const posOffset = computed(() => deptOffset.value + deptResults.value.length)
const pageOffset = computed(() => posOffset.value + posResults.value.length)
async function setActiveAndFocus(i: number) {
  activeIndex.value = i
  await nextTick()
}
</script>

<template>
  <div ref="rootRef" class="relative w-full max-w-md">
    <!-- Ô tìm kiếm -->
    <div class="relative">
      <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        placeholder="Tìm nhân viên, phòng ban, trang..."
        class="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:bg-background transition-all"
        @focus="focusOpen"
        @input="onInput"
        @keydown="onKeydown"
      />
      <button
        v-if="query"
        type="button"
        class="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded"
        @click="query = ''; inputRef?.focus()"
      >
        <XIcon class="w-4 h-4" />
      </button>
    </div>

    <!-- Panel kết quả -->
    <div
      v-if="open && query"
      class="absolute z-50 mt-2 w-full sm:w-[460px] max-h-[70vh] overflow-auto bg-card border border-border rounded-xl shadow-xl font-sans"
    >
      <div v-if="totalCount === 0" class="px-4 py-8 text-center text-sm text-muted-foreground">
        Không tìm thấy kết quả cho "<span class="text-foreground">{{ query }}</span>"
      </div>

      <!-- Nhân viên -->
      <div v-if="empResults.length" class="py-1.5">
        <div class="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nhân viên</div>
        <div
          v-for="(e, i) in empResults" :key="e.id"
          class="group flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
          :class="activeIndex === empOffset + i ? 'bg-accent/10' : 'hover:bg-muted/50'"
          @mouseenter="setActiveAndFocus(empOffset + i)"
          @click="goEmployee(e)"
        >
          <div class="w-8 h-8 shrink-0 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            <UserIcon class="w-4 h-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-foreground truncate">{{ e.fullName }}</div>
            <div class="text-xs text-muted-foreground truncate">
              <span class="font-mono">{{ e.employeeCode }}</span>
              <span v-if="e.departmentName"> · {{ e.departmentName }}</span>
              <span v-if="e.positionName"> · {{ e.positionName }}</span>
            </div>
          </div>
          <!-- Deep-link nhanh -->
          <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button" title="Xem chấm công"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-accent hover:bg-accent/10"
              @click.stop="goAttendance(e)"
            >
              <ClockIcon class="w-3.5 h-3.5" /> Công
            </button>
            <button
              v-if="canQuickPayroll"
              type="button" title="Xem lương"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-accent hover:bg-accent/10"
              @click.stop="goPayroll(e)"
            >
              <BanknoteIcon class="w-3.5 h-3.5" /> Lương
            </button>
          </div>
        </div>
      </div>

      <!-- Phòng ban -->
      <div v-if="deptResults.length" class="py-1.5 border-t border-border/60">
        <div class="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Phòng ban</div>
        <div
          v-for="(d, i) in deptResults" :key="d.id"
          class="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
          :class="activeIndex === deptOffset + i ? 'bg-accent/10' : 'hover:bg-muted/50'"
          @mouseenter="setActiveAndFocus(deptOffset + i)"
          @click="goAndClose('/departments')"
        >
          <div class="w-8 h-8 shrink-0 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Building2Icon class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-foreground truncate">{{ d.departmentName }}</div>
            <div class="text-xs text-muted-foreground font-mono truncate">{{ d.departmentCode }}</div>
          </div>
        </div>
      </div>

      <!-- Chức vụ -->
      <div v-if="posResults.length" class="py-1.5 border-t border-border/60">
        <div class="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Chức vụ</div>
        <div
          v-for="(p, i) in posResults" :key="p.id"
          class="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
          :class="activeIndex === posOffset + i ? 'bg-accent/10' : 'hover:bg-muted/50'"
          @mouseenter="setActiveAndFocus(posOffset + i)"
          @click="goAndClose('/positions')"
        >
          <div class="w-8 h-8 shrink-0 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <BriefcaseIcon class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-foreground truncate">{{ p.positionName }}</div>
            <div class="text-xs text-muted-foreground font-mono truncate">{{ p.positionCode }}</div>
          </div>
        </div>
      </div>

      <!-- Trang -->
      <div v-if="pageResults.length" class="py-1.5 border-t border-border/60">
        <div class="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Trang</div>
        <div
          v-for="(pg, i) in pageResults" :key="pg.path"
          class="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
          :class="activeIndex === pageOffset + i ? 'bg-accent/10' : 'hover:bg-muted/50'"
          @mouseenter="setActiveAndFocus(pageOffset + i)"
          @click="goAndClose(pg.path)"
        >
          <div class="w-8 h-8 shrink-0 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
            <CompassIcon class="w-4 h-4" />
          </div>
          <div class="text-sm font-medium text-foreground truncate">{{ pg.label }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
