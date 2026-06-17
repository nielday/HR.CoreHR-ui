<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Row as ARow, Col as ACol, Card as ACard, Statistic as AStatistic,
  Tag as ATag, Progress as AProgress, Button as AButton, Alert as AAlert,
  Empty as AEmpty, message,
} from 'ant-design-vue'
import { useEmployeeStore } from '../stores/employee'
import { useAttendanceStore, LEAVE_STATUS } from '../stores/attendance'
import { usePayrollStore } from '../stores/payroll'
import { useEmployeeContractStore } from '../stores/employee-contract'

const empStore = useEmployeeStore()
const attStore = useAttendanceStore()
const payrollStore = usePayrollStore()
const contractStore = useEmployeeContractStore()

const profile = ref<any>(null)
const notLinked = ref(false)
const loading = ref(true)

const now = new Date()
const curMonth = now.getMonth() + 1
const curYear = now.getFullYear()

// ===== Helpers =====
const vnd = (n: number) => (n ?? 0).toLocaleString('vi-VN') + ' ₫'
const round1 = (n: number) => Math.round((n ?? 0) * 10) / 10

function pad(n: number) { return String(n).padStart(2, '0') }
const todayKey = `${curYear}-${pad(curMonth)}-${pad(now.getDate())}`

function fmtTime(s?: string | null) {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(s?: string | null) {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return String(s)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

// ===== Chấm công hôm nay =====
const todayRec = computed<any>(() =>
  attStore.myAttendance.find((r: any) => String(r.workDate).slice(0, 10) === todayKey) || null
)
const checkedIn = computed(() => !!todayRec.value?.checkInTime)
const checkedOut = computed(() => !!todayRec.value?.checkOutTime)

// ===== Thống kê công tháng này =====
const presentDays = computed(() => attStore.myAttendance.filter((r: any) => r.status === 0).length)
const totalWorkedHours = computed(() => round1(attStore.myAttendance.reduce((s: number, r: any) => s + (r.workedHours || 0), 0)))
const overtimeHours = computed(() => round1(attStore.myAttendance.reduce((s: number, r: any) => s + (r.overtimeHours || 0), 0)))
const lateCount = computed(() => attStore.myAttendance.filter((r: any) => (r.lateMinutes || 0) > 0).length)

// ===== Phép =====
const annual = computed<any>(() => attStore.myLeaveBalance.find((b: any) => b.leaveType === 0) || null)
const annualPercent = computed(() => {
  const b = annual.value
  if (!b || b.entitledDays == null || b.entitledDays === 0) return 0
  return Math.min(100, Math.round(((b.entitledDays - (b.remainingDays ?? 0)) / b.entitledDays) * 100))
})
const pendingLeaves = computed(() => attStore.myLeaves.filter((l: any) => l.status === 0))

// ===== Lương kỳ gần nhất =====
const PAYROLL_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Chờ duyệt', color: 'orange' },
  1: { label: 'Đã duyệt', color: 'blue' },
  2: { label: 'Đã chi trả', color: 'green' },
}
const latestPayroll = computed<any>(() => {
  const ps = [...payrollStore.payrolls]
  ps.sort((a: any, b: any) => (b.year - a.year) || (b.month - a.month))
  return ps[0] || null
})

// ===== Hợp đồng =====
const activeContract = computed<any>(() => contractStore.contracts.find((c: any) => c.status === 1) || null)
const contractDaysLeft = computed<number | null>(() => {
  const end = activeContract.value?.endDate
  if (!end) return null
  const d = new Date(end)
  if (isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - now.getTime()) / 86400000)
})
const contractExpiringSoon = computed(() => contractDaysLeft.value != null && contractDaysLeft.value <= 60 && contractDaysLeft.value >= 0)

async function reloadAttendance() {
  await attStore.fetchMine(curMonth, curYear)
}
async function doCheckIn() {
  const ok = await attStore.checkIn()
  ok ? message.success('Đã chấm công vào') : message.error(attStore.error || 'Chấm công vào thất bại')
  await reloadAttendance()
}
async function doCheckOut() {
  const ok = await attStore.checkOut()
  ok ? message.success('Đã chấm công ra') : message.error(attStore.error || 'Chấm công ra thất bại')
  await reloadAttendance()
}

onMounted(async () => {
  const me = await empStore.fetchMyProfile()
  if (!me?.id) { notLinked.value = true; loading.value = false; return }
  profile.value = me
  await Promise.all([
    attStore.fetchMine(curMonth, curYear),
    attStore.fetchMyLeaveBalance(curYear),
    attStore.fetchMyLeaves(),
    payrollStore.fetchPayrolls(undefined, undefined, me.id),
    contractStore.fetchContractsByEmployee(me.id),
  ])
  loading.value = false
})
</script>

<template>
  <div class="space-y-6 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <!-- Lời chào -->
    <div>
      <h1 class="font-display text-4xl mb-1 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
        Xin chào{{ profile?.fullName ? ', ' + profile.fullName : '' }}
      </h1>
      <p class="text-muted-foreground font-sans text-lg" v-if="profile">
        {{ profile.positionName || '—' }} · {{ profile.departmentName || '—' }} · Mã NV {{ profile.employeeCode }}
      </p>
    </div>

    <AAlert
      v-if="notLinked"
      type="warning"
      show-icon
      message="Tài khoản của bạn chưa được gắn với hồ sơ nhân viên nên chưa có dữ liệu tổng quan."
    />

    <template v-else>
      <!-- Hàng 1: Chấm công hôm nay + KPI công tháng -->
      <ARow :gutter="[16, 16]">
        <ACol :xs="24" :lg="8">
          <ACard title="Chấm công hôm nay" :bordered="false" class="shadow-md rounded-2xl h-full">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground font-sans text-sm">{{ fmtDate(todayKey) }}</span>
                <ATag v-if="checkedOut" color="green">Đã tan ca</ATag>
                <ATag v-else-if="checkedIn" color="blue">Đang trong ca</ATag>
                <ATag v-else color="default">Chưa chấm công</ATag>
              </div>
              <ARow :gutter="16">
                <ACol :span="12">
                  <AStatistic title="Giờ vào" :value="fmtTime(todayRec?.checkInTime)" />
                </ACol>
                <ACol :span="12">
                  <AStatistic title="Giờ ra" :value="fmtTime(todayRec?.checkOutTime)" />
                </ACol>
              </ARow>
              <div class="flex gap-3 pt-2">
                <AButton type="primary" block :disabled="checkedIn || attStore.isLoading" @click="doCheckIn">
                  Chấm công vào
                </AButton>
                <AButton danger block :disabled="!checkedIn || checkedOut || attStore.isLoading" @click="doCheckOut">
                  Tan ca
                </AButton>
              </div>
            </div>
          </ACard>
        </ACol>

        <ACol :xs="24" :lg="16">
          <ACard :title="`Công tháng ${curMonth}/${curYear}`" :bordered="false" class="shadow-md rounded-2xl h-full">
            <ARow :gutter="[16, 16]">
              <ACol :xs="12" :md="6"><AStatistic title="Ngày có mặt" :value="presentDays" suffix="ngày" /></ACol>
              <ACol :xs="12" :md="6"><AStatistic title="Tổng giờ làm" :value="totalWorkedHours" suffix="h" /></ACol>
              <ACol :xs="12" :md="6"><AStatistic title="Giờ tăng ca" :value="overtimeHours" suffix="h" :value-style="{ color: '#d97706' }" /></ACol>
              <ACol :xs="12" :md="6"><AStatistic title="Số lần đi muộn" :value="lateCount" suffix="lần" :value-style="{ color: lateCount > 0 ? '#dc2626' : undefined }" /></ACol>
            </ARow>
          </ACard>
        </ACol>
      </ARow>

      <!-- Hàng 2: Phép · Đơn chờ duyệt · Lương -->
      <ARow :gutter="[16, 16]">
        <ACol :xs="24" :lg="8">
          <ACard title="Số phép còn lại" :bordered="false" class="shadow-md rounded-2xl h-full">
            <div v-if="annual" class="mb-4">
              <div class="flex items-baseline justify-between mb-1">
                <span class="font-sans text-sm text-muted-foreground">{{ annual.name }}</span>
                <span class="font-display text-lg text-foreground">
                  <template v-if="annual.entitledDays == null">Không giới hạn</template>
                  <template v-else>Còn {{ annual.remainingDays }} / {{ annual.entitledDays }} ngày</template>
                </span>
              </div>
              <AProgress v-if="annual.entitledDays != null" :percent="annualPercent" status="active" />
            </div>
            <div v-for="b in attStore.myLeaveBalance.filter((x:any) => x.leaveType !== 0)" :key="b.leaveType"
                 class="flex items-center justify-between py-1.5 border-t border-border/60 first:border-t-0">
              <span class="font-sans text-sm text-muted-foreground">{{ b.name }}</span>
              <span class="font-sans text-sm text-foreground">
                <template v-if="b.entitledDays == null">Đã dùng {{ b.usedDays }} ngày</template>
                <template v-else>Còn {{ b.remainingDays }} / {{ b.entitledDays }}</template>
              </span>
            </div>
            <AEmpty v-if="attStore.myLeaveBalance.length === 0" :image="undefined" description="Chưa có dữ liệu phép" />
          </ACard>
        </ACol>

        <ACol :xs="24" :lg="8">
          <ACard :bordered="false" class="shadow-md rounded-2xl h-full">
            <template #title>
              Đơn nghỉ chờ duyệt
              <ATag v-if="pendingLeaves.length" color="orange" class="ml-2">{{ pendingLeaves.length }}</ATag>
            </template>
            <div v-if="pendingLeaves.length">
              <div v-for="l in pendingLeaves.slice(0, 4)" :key="l.id"
                   class="py-2 border-t border-border/60 first:border-t-0">
                <div class="flex items-center justify-between">
                  <span class="font-sans text-sm text-foreground">{{ l.leaveTypeName }}</span>
                  <ATag :color="LEAVE_STATUS[l.status]?.color">{{ LEAVE_STATUS[l.status]?.label }}</ATag>
                </div>
                <div class="font-mono text-xs text-muted-foreground mt-0.5">
                  {{ fmtDate(l.fromDate) }} → {{ fmtDate(l.toDate) }} · {{ l.totalDays }} ngày
                </div>
              </div>
            </div>
            <AEmpty v-else :image="undefined" description="Không có đơn đang chờ" />
            <div class="pt-3">
              <RouterLink to="/attendance/leave"><AButton size="small">Quản lý đơn nghỉ</AButton></RouterLink>
            </div>
          </ACard>
        </ACol>

        <ACol :xs="24" :lg="8">
          <ACard title="Lương kỳ gần nhất" :bordered="false" class="shadow-md rounded-2xl h-full">
            <div v-if="latestPayroll">
              <AStatistic title="Thực lãnh" :value="latestPayroll.netSalary" :formatter="(v:any) => vnd(Number(v))" :value-style="{ color: '#2563eb' }" />
              <div class="flex items-center justify-between mt-3">
                <span class="font-sans text-sm text-muted-foreground">Kỳ {{ latestPayroll.month }}/{{ latestPayroll.year }}</span>
                <ATag :color="PAYROLL_STATUS[latestPayroll.status]?.color">{{ PAYROLL_STATUS[latestPayroll.status]?.label }}</ATag>
              </div>
            </div>
            <AEmpty v-else :image="undefined" description="Chưa có bảng lương" />
            <div class="pt-3">
              <RouterLink to="/my/payslip"><AButton size="small">Xem bảng lương</AButton></RouterLink>
            </div>
          </ACard>
        </ACol>
      </ARow>

      <!-- Hàng 3: Hợp đồng -->
      <ARow :gutter="[16, 16]">
        <ACol :xs="24" :lg="12">
          <ACard title="Hợp đồng hiện hành" :bordered="false" class="shadow-md rounded-2xl h-full">
            <div v-if="activeContract" class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-display text-lg text-foreground">{{ activeContract.contractTypeName || '—' }}</span>
                <span class="font-mono text-sm text-muted-foreground">{{ activeContract.contractCode || '' }}</span>
              </div>
              <div class="font-sans text-sm text-muted-foreground">
                Từ {{ fmtDate(activeContract.startDate) }}
                <template v-if="activeContract.endDate"> đến {{ fmtDate(activeContract.endDate) }}</template>
                <template v-else> · không thời hạn</template>
              </div>
              <AAlert
                v-if="contractExpiringSoon"
                type="warning"
                show-icon
                :message="`Hợp đồng sẽ hết hạn sau ${contractDaysLeft} ngày — hãy liên hệ HR để gia hạn.`"
              />
            </div>
            <AEmpty v-else :image="undefined" description="Chưa có hợp đồng" />
            <div class="pt-3">
              <RouterLink to="/my/contracts"><AButton size="small">Xem hợp đồng</AButton></RouterLink>
            </div>
          </ACard>
        </ACol>

        <ACol :xs="24" :lg="12">
          <ACard title="Lối tắt" :bordered="false" class="shadow-md rounded-2xl h-full">
            <div class="grid grid-cols-2 gap-3">
              <RouterLink to="/attendance/me"><AButton block>Chấm công của tôi</AButton></RouterLink>
              <RouterLink to="/attendance/leave"><AButton block>Đơn nghỉ phép</AButton></RouterLink>
              <RouterLink to="/my/payslip"><AButton block>Bảng lương của tôi</AButton></RouterLink>
              <RouterLink to="/profile"><AButton block>Hồ sơ của tôi</AButton></RouterLink>
            </div>
          </ACard>
        </ACol>
      </ARow>
    </template>
  </div>
</template>
