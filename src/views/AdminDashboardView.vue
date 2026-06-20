<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Row as ARow, Col as ACol, Card as ACard, Statistic as AStatistic,
  Progress as AProgress, Tag as ATag, Spin as ASpin, Empty as AEmpty,
} from 'ant-design-vue'
import {
  UsersIcon, UserCheckIcon, UserPlusIcon, UserMinusIcon, BriefcaseIcon, WalletIcon,
  CalendarClockIcon, FileWarningIcon, AlertTriangleIcon, ClipboardCheckIcon, BanknoteIcon,
  PlusIcon, CalendarCheckIcon, CalculatorIcon, CheckCheckIcon,
} from 'lucide-vue-next'
import { useEmployeeStore } from '../stores/employee'
import { useDepartmentStore } from '../stores/department'
import { useAttendanceStore } from '../stores/attendance'
import { usePayrollStore } from '../stores/payroll'
import { useEmployeeContractStore } from '../stores/employee-contract'

const router = useRouter()
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
const noContract = computed(() => emps.value.filter((e) => isWorking(e) && !e.currentContractTypeId))

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
  <ASpin :spinning="loading">
    <div class="space-y-6 pb-12">
      <!-- Header -->
      <div>
        <h1 class="font-display text-2xl text-foreground leading-tight">Tổng quan nhân sự</h1>
        <p class="text-muted-foreground font-sans text-sm mt-0.5">Bức tranh nhân sự & việc cần xử lý — tháng {{ curMonth }}/{{ curYear }}.</p>
      </div>

      <!-- HÀNG KPI -->
      <ARow :gutter="[12, 12]">
        <ACol :xs="12" :md="8" :xl="4">
          <ACard :bordered="false" class="shadow-sm rounded-2xl">
            <AStatistic :value="kpi.total" :value-style="{ color: '#0f172a' }">
              <template #title><span class="inline-flex items-center gap-1.5 text-muted-foreground"><UsersIcon class="w-4 h-4" /> Tổng nhân viên</span></template>
            </AStatistic>
          </ACard>
        </ACol>
        <ACol :xs="12" :md="8" :xl="4">
          <ACard :bordered="false" class="shadow-sm rounded-2xl">
            <AStatistic :value="kpi.active" :value-style="{ color: '#16a34a' }">
              <template #title><span class="inline-flex items-center gap-1.5 text-muted-foreground"><UserCheckIcon class="w-4 h-4" /> Đang làm</span></template>
            </AStatistic>
          </ACard>
        </ACol>
        <ACol :xs="12" :md="8" :xl="4">
          <ACard :bordered="false" class="shadow-sm rounded-2xl">
            <AStatistic :value="kpi.probation" :value-style="{ color: '#d97706' }">
              <template #title><span class="inline-flex items-center gap-1.5 text-muted-foreground"><BriefcaseIcon class="w-4 h-4" /> Thử việc</span></template>
            </AStatistic>
          </ACard>
        </ACol>
        <ACol :xs="12" :md="8" :xl="4">
          <ACard :bordered="false" class="shadow-sm rounded-2xl">
            <AStatistic :value="kpi.newThisMonth" :value-style="{ color: '#2563eb' }">
              <template #title><span class="inline-flex items-center gap-1.5 text-muted-foreground"><UserPlusIcon class="w-4 h-4" /> Tuyển mới tháng</span></template>
            </AStatistic>
          </ACard>
        </ACol>
        <ACol :xs="12" :md="8" :xl="4">
          <ACard :bordered="false" class="shadow-sm rounded-2xl">
            <AStatistic :value="kpi.resigned" :value-style="{ color: '#94a3b8' }">
              <template #title><span class="inline-flex items-center gap-1.5 text-muted-foreground"><UserMinusIcon class="w-4 h-4" /> Đã nghỉ việc</span></template>
            </AStatistic>
          </ACard>
        </ACol>
        <ACol :xs="12" :md="8" :xl="4">
          <ACard hoverable :bordered="false" class="shadow-sm rounded-2xl cursor-pointer" @click="router.push('/payroll/dashboard')">
            <AStatistic :value="compactVnd(salaryFund)" :value-style="{ color: '#0052FF', fontSize: '20px' }">
              <template #title><span class="inline-flex items-center gap-1.5 text-muted-foreground"><WalletIcon class="w-4 h-4" /> Quỹ lương tháng</span></template>
            </AStatistic>
          </ACard>
        </ACol>
      </ARow>

      <!-- CẦN XỬ LÝ -->
      <div>
        <h2 class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5"><AlertTriangleIcon class="w-3.5 h-3.5 text-amber-500" /> Cần xử lý</h2>
        <ARow :gutter="[12, 12]">
          <ACol :xs="24" :sm="12" :xl="6">
            <ACard hoverable :bordered="false" class="shadow-sm rounded-2xl cursor-pointer" @click="router.push('/attendance/leave-approval')">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><ClipboardCheckIcon class="w-5 h-5" /></div>
                  <div><div class="text-sm font-medium text-foreground">Đơn phép chờ duyệt</div><div class="text-xs text-muted-foreground">Cần duyệt sớm</div></div>
                </div>
                <span class="font-display text-2xl" :class="pendingLeaves ? 'text-amber-600' : 'text-foreground/30'">{{ pendingLeaves }}</span>
              </div>
            </ACard>
          </ACol>
          <ACol :xs="24" :sm="12" :xl="6">
            <ACard hoverable :bordered="false" class="shadow-sm rounded-2xl cursor-pointer" @click="router.push('/payroll/records')">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><BanknoteIcon class="w-5 h-5" /></div>
                  <div><div class="text-sm font-medium text-foreground">Lương chờ xử lý</div><div class="text-xs text-muted-foreground">{{ pendingPayroll }} chờ duyệt · {{ toPayPayroll }} chờ chi trả</div></div>
                </div>
                <span class="font-display text-2xl" :class="(pendingPayroll + toPayPayroll) ? 'text-blue-600' : 'text-foreground/30'">{{ pendingPayroll + toPayPayroll }}</span>
              </div>
            </ACard>
          </ACol>
          <ACol :xs="24" :sm="12" :xl="6">
            <ACard hoverable :bordered="false" class="shadow-sm rounded-2xl cursor-pointer" @click="router.push('/employees')">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center"><CalendarClockIcon class="w-5 h-5" /></div>
                  <div><div class="text-sm font-medium text-foreground">HĐ sắp hết hạn</div><div class="text-xs text-muted-foreground">Trong 30 ngày</div></div>
                </div>
                <span class="font-display text-2xl" :class="expiringContracts.length ? 'text-rose-600' : 'text-foreground/30'">{{ expiringContracts.length }}</span>
              </div>
            </ACard>
          </ACol>
          <ACol :xs="24" :sm="12" :xl="6">
            <ACard hoverable :bordered="false" class="shadow-sm rounded-2xl cursor-pointer" @click="router.push('/employees')">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center"><FileWarningIcon class="w-5 h-5" /></div>
                  <div><div class="text-sm font-medium text-foreground">NV chưa có hợp đồng</div><div class="text-xs text-muted-foreground">Đang làm, thiếu HĐ</div></div>
                </div>
                <span class="font-display text-2xl" :class="noContract.length ? 'text-orange-600' : 'text-foreground/30'">{{ noContract.length }}</span>
              </div>
            </ACard>
          </ACol>
        </ARow>
      </div>

      <!-- HÀNG: Chấm công hôm nay + Cơ cấu phòng ban -->
      <ARow :gutter="[16, 16]">
        <ACol :xs="24" :lg="8">
          <ACard :bordered="false" class="shadow-sm rounded-2xl h-full">
            <template #title><span class="flex items-center justify-between">Chấm công hôm nay <span class="font-mono text-xs text-muted-foreground">{{ pad2(todayDay) }}/{{ pad2(curMonth) }}</span></span></template>
            <ARow :gutter="[12, 12]">
              <ACol :span="12"><AStatistic title="Có mặt" :value="todayStats.present" :value-style="{ color: '#16a34a' }" /></ACol>
              <ACol :span="12"><AStatistic title="Đi muộn" :value="todayStats.late" :value-style="{ color: '#dc2626' }" /></ACol>
              <ACol :span="12"><AStatistic title="Đang nghỉ phép" :value="todayStats.onLeave" :value-style="{ color: '#2563eb' }" /></ACol>
              <ACol :span="12"><AStatistic title="Chưa chấm" :value="todayStats.notChecked" :value-style="{ color: '#94a3b8' }" /></ACol>
            </ARow>
          </ACard>
        </ACol>
        <ACol :xs="24" :lg="16">
          <ACard :bordered="false" class="shadow-sm rounded-2xl h-full" title="Nhân sự theo phòng ban">
            <div v-if="byDepartment.length" class="space-y-3">
              <div v-for="d in byDepartment.slice(0, 8)" :key="d.label">
                <div class="flex items-center justify-between text-sm mb-1">
                  <span class="text-foreground truncate">{{ d.label }}</span>
                  <span class="font-mono text-muted-foreground">{{ d.value }} · {{ pct(d.value) }}%</span>
                </div>
                <AProgress :percent="Math.round((d.value / maxDept) * 100)" :show-info="false" :stroke-color="{ '0%': '#0052FF', '100%': '#4D7CFF' }" size="small" />
              </div>
            </div>
            <AEmpty v-else :image="undefined" description="Chưa có dữ liệu" />
          </ACard>
        </ACol>
      </ARow>

      <!-- HÀNG: Loại HĐ + Giới tính + HĐ sắp hết hạn -->
      <ARow :gutter="[16, 16]">
        <ACol :xs="24" :lg="8">
          <ACard :bordered="false" class="shadow-sm rounded-2xl h-full" title="Theo loại hợp đồng">
            <div class="space-y-3">
              <div v-for="(c, i) in byContractType" :key="c.label">
                <div class="flex items-center justify-between text-sm mb-1">
                  <span class="inline-flex items-center gap-2 text-foreground">
                    <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: CONTRACT_COLORS[i % CONTRACT_COLORS.length] }"></span>{{ c.label }}
                  </span>
                  <span class="font-mono text-muted-foreground">{{ c.value }} · {{ pct(c.value) }}%</span>
                </div>
                <AProgress :percent="pct(c.value)" :show-info="false" :stroke-color="CONTRACT_COLORS[i % CONTRACT_COLORS.length]" size="small" />
              </div>
            </div>
          </ACard>
        </ACol>

        <ACol :xs="24" :lg="8">
          <ACard :bordered="false" class="shadow-sm rounded-2xl h-full" title="Theo giới tính">
            <div class="space-y-3">
              <div v-for="g in byGender" :key="g.label">
                <div class="flex items-center justify-between text-sm mb-1">
                  <span class="text-foreground">{{ g.label }}</span>
                  <span class="font-mono text-muted-foreground">{{ g.value }} · {{ pct(g.value) }}%</span>
                </div>
                <AProgress :percent="pct(g.value)" :show-info="false" stroke-color="#0052FF" size="small" />
              </div>
            </div>
          </ACard>
        </ACol>

        <ACol :xs="24" :lg="8">
          <ACard :bordered="false" class="shadow-sm rounded-2xl h-full">
            <template #title><span class="flex items-center justify-between">HĐ sắp hết hạn <ATag v-if="expiringContracts.length" color="red">{{ expiringContracts.length }}</ATag></span></template>
            <div v-if="expiringContracts.length" class="divide-y divide-border/50">
              <div v-for="c in expiringContracts.slice(0, 6)" :key="c.id" class="flex items-center justify-between py-2 first:pt-0">
                <div class="min-w-0">
                  <div class="text-sm text-foreground truncate">{{ c._name || ('NV ' + (c._code || '')) }}</div>
                  <div class="text-xs text-muted-foreground">{{ c.contractTypeName }} · {{ fmtDate(c.endDate) }}</div>
                </div>
                <ATag :color="(c._days ?? 0) <= 7 ? 'red' : 'orange'" class="shrink-0">còn {{ c._days }}d</ATag>
              </div>
            </div>
            <AEmpty v-else :image="undefined" description="Không có HĐ sắp hết hạn" />
          </ACard>
        </ACol>
      </ARow>

      <!-- LỐI TẮT -->
      <div>
        <h2 class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Lối tắt</h2>
        <ARow :gutter="[12, 12]">
          <ACol :xs="12" :md="6">
            <ACard hoverable :bordered="false" class="shadow-sm rounded-2xl cursor-pointer" @click="router.push('/employees')">
              <div class="flex items-center gap-3"><div class="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center"><PlusIcon class="w-5 h-5" /></div><span class="text-sm font-medium text-foreground">Thêm nhân viên</span></div>
            </ACard>
          </ACol>
          <ACol :xs="12" :md="6">
            <ACard hoverable :bordered="false" class="shadow-sm rounded-2xl cursor-pointer" @click="router.push('/attendance/closing')">
              <div class="flex items-center gap-3"><div class="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center"><CalendarCheckIcon class="w-5 h-5" /></div><span class="text-sm font-medium text-foreground">Chốt công</span></div>
            </ACard>
          </ACol>
          <ACol :xs="12" :md="6">
            <ACard hoverable :bordered="false" class="shadow-sm rounded-2xl cursor-pointer" @click="router.push('/payroll/records')">
              <div class="flex items-center gap-3"><div class="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center"><CalculatorIcon class="w-5 h-5" /></div><span class="text-sm font-medium text-foreground">Chạy lương</span></div>
            </ACard>
          </ACol>
          <ACol :xs="12" :md="6">
            <ACard hoverable :bordered="false" class="shadow-sm rounded-2xl cursor-pointer" @click="router.push('/attendance/leave-approval')">
              <div class="flex items-center gap-3"><div class="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center"><CheckCheckIcon class="w-5 h-5" /></div><span class="text-sm font-medium text-foreground">Duyệt phép</span></div>
            </ACard>
          </ACol>
        </ARow>
      </div>
    </div>
  </ASpin>
</template>
