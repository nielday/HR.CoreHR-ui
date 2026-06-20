<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  UsersIcon, UserCheckIcon, UserPlusIcon, UserMinusIcon, BriefcaseIcon, WalletIcon,
  CalendarClockIcon, FileWarningIcon, AlertTriangleIcon, ClipboardCheckIcon, BanknoteIcon,
  PlusIcon, CalendarCheckIcon, CalculatorIcon, CheckCheckIcon, ChevronRightIcon,
} from 'lucide-vue-next'
import { useEmployeeStore } from '../stores/employee'
import { useDepartmentStore } from '../stores/department'
import { useAttendanceStore } from '../stores/attendance'
import { usePayrollStore } from '../stores/payroll'
import { useEmployeeContractStore } from '../stores/employee-contract'

const empStore = useEmployeeStore()
const deptStore = useDepartmentStore()
const attStore = useAttendanceStore()
const payrollStore = usePayrollStore()
const contractStore = useEmployeeContractStore()

const loading = ref(true)
const now = new Date()
const curMonth = now.getMonth() + 1
const curYear = now.getFullYear()
const todayDay = now.getDate()

// ===== Helpers =====
const vnd = (n: number) => (n ?? 0).toLocaleString('vi-VN') + ' ₫'
const compactVnd = (n: number) => {
  if (!n) return '0 ₫'
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2).replace(/\.00$/, '') + ' tỷ'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' tr'
  return n.toLocaleString('vi-VN') + ' ₫'
}
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const fmtDate = (s?: string | null) => {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}
const daysUntil = (s?: string | null) => {
  if (!s) return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - now.getTime()) / 86400000)
}
const dayOf = (v: any) => Number(String(v).slice(8, 10))

const emps = computed<any[]>(() => empStore.allEmployees as any[])
const empMap = computed<Record<string, any>>(() => {
  const m: Record<string, any> = {}
  for (const e of emps.value) if (e.id) m[e.id] = e
  return m
})
const isWorking = (e: any) => e.workingStatus === 'Active' || e.workingStatus === 'Probation'

// ===== KPI nhân sự =====
const kpi = computed(() => {
  const list = emps.value
  return {
    total: list.length,
    active: list.filter((e) => e.workingStatus === 'Active').length,
    probation: list.filter((e) => e.workingStatus === 'Probation').length,
    suspended: list.filter((e) => e.workingStatus === 'Suspended').length,
    resigned: list.filter((e) => e.workingStatus === 'Resigned').length,
    newThisMonth: list.filter((e) => {
      const d = new Date(e.hireDate)
      return !isNaN(d.getTime()) && d.getMonth() + 1 === curMonth && d.getFullYear() === curYear
    }).length,
  }
})
const salaryFund = computed(() => payrollStore.dashboard?.totalSalaryFund ?? 0)

// ===== Việc cần xử lý =====
const pendingLeaves = computed(() => attStore.pendingLeaves.length)
const pendingPayroll = computed(() => (payrollStore.payrolls as any[]).filter((p) => p.status === 0).length)
const toPayPayroll = computed(() => (payrollStore.payrolls as any[]).filter((p) => p.status === 1).length)

const expiringContracts = computed(() =>
  (contractStore.allContracts as any[])
    .filter((c) => c.status === 1 && c.endDate)
    .map((c) => ({ ...c, _days: daysUntil(c.endDate), _name: empMap.value[c.employeeId]?.fullName, _code: empMap.value[c.employeeId]?.employeeCode }))
    .filter((c) => c._days !== null && c._days >= 0 && c._days <= 30)
    .sort((a, b) => (a._days ?? 0) - (b._days ?? 0)),
)
const noContract = computed(() =>
  emps.value.filter((e) => isWorking(e) && !e.currentContractTypeId),
)

// ===== Chấm công hôm nay =====
const todayRecs = computed<any[]>(() =>
  (attStore.attendanceList as any[]).filter((r) => dayOf(r.workDate) === todayDay),
)
const todayStats = computed(() => {
  const recs = todayRecs.value
  return {
    present: recs.filter((r) => r.status === 0).length,
    late: recs.filter((r) => (r.lateMinutes || 0) > 0).length,
    onLeave: recs.filter((r) => r.status === 2).length,
    absent: recs.filter((r) => r.status === 1).length,
    notChecked: Math.max(0, kpi.value.active + kpi.value.probation - recs.length),
  }
})

// ===== Cơ cấu nhân sự =====
function groupCount(getter: (e: any) => string) {
  const m: Record<string, number> = {}
  for (const e of emps.value) {
    if (e.workingStatus === 'Resigned') continue
    const k = getter(e) || 'Khác'
    m[k] = (m[k] || 0) + 1
  }
  return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}
const byDepartment = computed(() => groupCount((e) => e.departmentName || 'Chưa phân phòng'))
const byContractType = computed(() => groupCount((e) => e.currentContractTypeName || 'Chưa có HĐ'))
const byGender = computed(() => {
  const map: Record<string, string> = { Male: 'Nam', Female: 'Nữ', Other: 'Khác' }
  return groupCount((e) => map[e.gender as string] || 'Chưa rõ')
})
const maxDept = computed(() => Math.max(1, ...byDepartment.value.map((d) => d.value)))
const workingTotal = computed(() => kpi.value.active + kpi.value.probation)
const pct = (n: number) => (workingTotal.value ? Math.round((n / workingTotal.value) * 100) : 0)

const CONTRACT_COLORS = ['#0052FF', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6']

onMounted(async () => {
  await Promise.all([
    empStore.allEmployees.length ? Promise.resolve() : empStore.fetchAllEmployees(),
    deptStore.departments.length ? Promise.resolve() : deptStore.fetchDepartments(),
    attStore.fetchPendingLeaves(),
    attStore.fetchAttendance(undefined, curMonth, curYear),
    payrollStore.fetchDashboard(curMonth, curYear),
    payrollStore.fetchPayrolls(curMonth, curYear),
    contractStore.fetchAllContracts(),
  ])
  loading.value = false
})
</script>

<template>
  <div class="space-y-6 motion-safe:animate-in motion-safe:fade-in duration-500 pb-12">
    <!-- Header -->
    <div>
      <h1 class="font-display text-2xl text-foreground leading-tight">Tổng quan nhân sự</h1>
      <p class="text-muted-foreground font-sans text-sm mt-0.5">Bức tranh nhân sự & việc cần xử lý — tháng {{ curMonth }}/{{ curYear }}.</p>
    </div>

    <!-- HÀNG KPI -->
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <div class="bg-card border border-border rounded-xl p-4">
        <div class="flex items-center gap-2 text-muted-foreground text-xs mb-1"><UsersIcon class="w-4 h-4" /> Tổng nhân viên</div>
        <div class="font-display text-2xl text-foreground">{{ kpi.total }}</div>
      </div>
      <div class="bg-card border border-border rounded-xl p-4">
        <div class="flex items-center gap-2 text-muted-foreground text-xs mb-1"><UserCheckIcon class="w-4 h-4" /> Đang làm</div>
        <div class="font-display text-2xl text-green-600">{{ kpi.active }}</div>
      </div>
      <div class="bg-card border border-border rounded-xl p-4">
        <div class="flex items-center gap-2 text-muted-foreground text-xs mb-1"><BriefcaseIcon class="w-4 h-4" /> Thử việc</div>
        <div class="font-display text-2xl text-amber-600">{{ kpi.probation }}</div>
      </div>
      <div class="bg-card border border-border rounded-xl p-4">
        <div class="flex items-center gap-2 text-muted-foreground text-xs mb-1"><UserPlusIcon class="w-4 h-4" /> Tuyển mới tháng</div>
        <div class="font-display text-2xl text-blue-600">{{ kpi.newThisMonth }}</div>
      </div>
      <div class="bg-card border border-border rounded-xl p-4">
        <div class="flex items-center gap-2 text-muted-foreground text-xs mb-1"><UserMinusIcon class="w-4 h-4" /> Đã nghỉ việc</div>
        <div class="font-display text-2xl text-foreground/60">{{ kpi.resigned }}</div>
      </div>
      <RouterLink to="/payroll/dashboard" class="bg-card border border-border rounded-xl p-4 hover:border-accent/40 transition-colors">
        <div class="flex items-center gap-2 text-muted-foreground text-xs mb-1"><WalletIcon class="w-4 h-4" /> Quỹ lương tháng</div>
        <div class="font-display text-xl text-accent">{{ compactVnd(salaryFund) }}</div>
      </RouterLink>
    </div>

    <!-- CẦN XỬ LÝ -->
    <div>
      <h2 class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5"><AlertTriangleIcon class="w-3.5 h-3.5 text-amber-500" /> Cần xử lý</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <RouterLink to="/attendance/leave-approval" class="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-amber-300 hover:bg-amber-50/40 transition-all">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><ClipboardCheckIcon class="w-5 h-5" /></div>
            <div><div class="text-sm text-foreground font-medium">Đơn phép chờ duyệt</div><div class="text-xs text-muted-foreground">Cần duyệt sớm</div></div>
          </div>
          <div class="font-display text-2xl" :class="pendingLeaves ? 'text-amber-600' : 'text-foreground/30'">{{ pendingLeaves }}</div>
        </RouterLink>

        <RouterLink to="/payroll/records" class="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-blue-300 hover:bg-blue-50/40 transition-all">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><BanknoteIcon class="w-5 h-5" /></div>
            <div><div class="text-sm text-foreground font-medium">Lương chờ duyệt / chi trả</div><div class="text-xs text-muted-foreground">{{ pendingPayroll }} chờ duyệt · {{ toPayPayroll }} chờ chi trả</div></div>
          </div>
          <div class="font-display text-2xl" :class="(pendingPayroll + toPayPayroll) ? 'text-blue-600' : 'text-foreground/30'">{{ pendingPayroll + toPayPayroll }}</div>
        </RouterLink>

        <RouterLink to="/employees" class="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-rose-300 hover:bg-rose-50/40 transition-all">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center"><CalendarClockIcon class="w-5 h-5" /></div>
            <div><div class="text-sm text-foreground font-medium">HĐ sắp hết hạn (≤30 ngày)</div><div class="text-xs text-muted-foreground">Cần gia hạn</div></div>
          </div>
          <div class="font-display text-2xl" :class="expiringContracts.length ? 'text-rose-600' : 'text-foreground/30'">{{ expiringContracts.length }}</div>
        </RouterLink>

        <RouterLink to="/employees" class="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-orange-300 hover:bg-orange-50/40 transition-all">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center"><FileWarningIcon class="w-5 h-5" /></div>
            <div><div class="text-sm text-foreground font-medium">NV chưa có hợp đồng</div><div class="text-xs text-muted-foreground">Đang làm nhưng thiếu HĐ</div></div>
          </div>
          <div class="font-display text-2xl" :class="noContract.length ? 'text-orange-600' : 'text-foreground/30'">{{ noContract.length }}</div>
        </RouterLink>
      </div>
    </div>

    <!-- HÀNG: Chấm công hôm nay + Cơ cấu phòng ban -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Chấm công hôm nay -->
      <div class="bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-foreground">Chấm công hôm nay</h3>
          <span class="font-mono text-xs text-muted-foreground">{{ pad2(todayDay) }}/{{ pad2(curMonth) }}</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-lg bg-green-50 border border-green-100 p-3"><div class="text-xs text-green-700">Có mặt</div><div class="font-display text-xl text-green-600">{{ todayStats.present }}</div></div>
          <div class="rounded-lg bg-red-50 border border-red-100 p-3"><div class="text-xs text-red-700">Đi muộn</div><div class="font-display text-xl text-red-600">{{ todayStats.late }}</div></div>
          <div class="rounded-lg bg-blue-50 border border-blue-100 p-3"><div class="text-xs text-blue-700">Đang nghỉ phép</div><div class="font-display text-xl text-blue-600">{{ todayStats.onLeave }}</div></div>
          <div class="rounded-lg bg-muted/40 border border-border p-3"><div class="text-xs text-muted-foreground">Chưa chấm</div><div class="font-display text-xl text-foreground/60">{{ todayStats.notChecked }}</div></div>
        </div>
        <RouterLink to="/attendance/records" class="mt-4 inline-flex items-center gap-1 text-sm text-accent hover:underline">Xem bảng chấm công <ChevronRightIcon class="w-4 h-4" /></RouterLink>
      </div>

      <!-- Cơ cấu theo phòng ban -->
      <div class="bg-card border border-border rounded-xl p-5 lg:col-span-2">
        <h3 class="font-semibold text-foreground mb-4">Nhân sự theo phòng ban</h3>
        <div v-if="byDepartment.length" class="space-y-2.5">
          <div v-for="d in byDepartment.slice(0, 8)" :key="d.label" class="flex items-center gap-3">
            <div class="w-36 shrink-0 text-sm text-foreground truncate" :title="d.label">{{ d.label }}</div>
            <div class="flex-1 h-5 bg-muted/40 rounded-md overflow-hidden">
              <div class="h-full bg-gradient-to-r from-accent to-accent-secondary rounded-md transition-all" :style="{ width: Math.round((d.value / maxDept) * 100) + '%' }"></div>
            </div>
            <div class="w-10 text-right font-mono text-sm text-foreground">{{ d.value }}</div>
          </div>
        </div>
        <div v-else class="text-sm text-muted-foreground py-8 text-center">Chưa có dữ liệu</div>
      </div>
    </div>

    <!-- HÀNG: Loại HĐ + Giới tính + HĐ sắp hết hạn -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Loại hợp đồng -->
      <div class="bg-card border border-border rounded-xl p-5">
        <h3 class="font-semibold text-foreground mb-4">Theo loại hợp đồng</h3>
        <div class="space-y-2.5">
          <div v-for="(c, i) in byContractType" :key="c.label" class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: CONTRACT_COLORS[i % CONTRACT_COLORS.length] }"></span>
              <span class="text-foreground">{{ c.label }}</span>
            </div>
            <span class="font-mono text-muted-foreground">{{ c.value }} · {{ pct(c.value) }}%</span>
          </div>
        </div>
      </div>

      <!-- Giới tính -->
      <div class="bg-card border border-border rounded-xl p-5">
        <h3 class="font-semibold text-foreground mb-4">Theo giới tính</h3>
        <div class="space-y-2.5">
          <div v-for="g in byGender" :key="g.label" class="flex items-center justify-between text-sm">
            <span class="text-foreground">{{ g.label }}</span>
            <span class="font-mono text-muted-foreground">{{ g.value }} · {{ pct(g.value) }}%</span>
          </div>
        </div>
      </div>

      <!-- HĐ sắp hết hạn (danh sách) -->
      <div class="bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-foreground">HĐ sắp hết hạn</h3>
          <span v-if="expiringContracts.length" class="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 font-medium">{{ expiringContracts.length }}</span>
        </div>
        <div v-if="expiringContracts.length" class="space-y-2">
          <div v-for="c in expiringContracts.slice(0, 5)" :key="c.id" class="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
            <div class="min-w-0">
              <div class="text-foreground truncate">{{ c._name || 'NV ' + (c._code || '') }}</div>
              <div class="text-xs text-muted-foreground">{{ c.contractTypeName }} · {{ fmtDate(c.endDate) }}</div>
            </div>
            <span class="shrink-0 ml-2 text-xs font-medium px-2 py-0.5 rounded-full" :class="(c._days ?? 0) <= 7 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'">còn {{ c._days }}d</span>
          </div>
        </div>
        <div v-else class="text-sm text-muted-foreground py-6 text-center">Không có HĐ nào sắp hết hạn</div>
      </div>
    </div>

    <!-- LỐI TẮT -->
    <div>
      <h2 class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Lối tắt</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RouterLink to="/employees" class="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-accent/40 hover:shadow-sm transition-all">
          <div class="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center"><PlusIcon class="w-5 h-5" /></div>
          <span class="text-sm font-medium text-foreground">Thêm nhân viên</span>
        </RouterLink>
        <RouterLink to="/attendance/closing" class="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-accent/40 hover:shadow-sm transition-all">
          <div class="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center"><CalendarCheckIcon class="w-5 h-5" /></div>
          <span class="text-sm font-medium text-foreground">Chốt công</span>
        </RouterLink>
        <RouterLink to="/payroll/records" class="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-accent/40 hover:shadow-sm transition-all">
          <div class="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center"><CalculatorIcon class="w-5 h-5" /></div>
          <span class="text-sm font-medium text-foreground">Chạy lương</span>
        </RouterLink>
        <RouterLink to="/attendance/leave-approval" class="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-accent/40 hover:shadow-sm transition-all">
          <div class="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center"><CheckCheckIcon class="w-5 h-5" /></div>
          <span class="text-sm font-medium text-foreground">Duyệt phép</span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
