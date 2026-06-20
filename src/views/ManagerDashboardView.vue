<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Row as ARow, Col as ACol, Card as ACard, Statistic as AStatistic,
  Tag as ATag, Button as AButton, Empty as AEmpty,
} from 'ant-design-vue'
import { useEmployeeStore } from '../stores/employee'
import { useAttendanceStore, ATTENDANCE_STATUS, LEAVE_STATUS } from '../stores/attendance'
import { useDepartmentStore } from '../stores/department'

const empStore = useEmployeeStore()
const attStore = useAttendanceStore()
const deptStore = useDepartmentStore()

const now = new Date()
const curMonth = now.getMonth() + 1
const curYear = now.getFullYear()

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

// employeeId -> { name, code }
const empMap = computed<Record<string, { name: string; code: string }>>(() => {
  const m: Record<string, { name: string; code: string }> = {}
  for (const e of empStore.employees as any[]) if (e.id) m[e.id] = { name: e.fullName, code: e.employeeCode }
  return m
})

// Tên các phòng mình quản lý (gốc của cây)
const managedDeptNames = computed(() => (deptStore.departmentTree as any[]).map((d) => d.departmentName))

const headcount = computed(() => empStore.employees.length)

// Chấm công hôm nay (đã được backend giới hạn theo phòng quản lý)
const todayRecords = computed(() =>
  (attStore.attendanceList as any[]).filter((r) => String(r.workDate).slice(0, 10) === todayKey)
)
const presentToday = computed(() => todayRecords.value.filter((r) => r.checkInTime).length)
const lateToday = computed(() => todayRecords.value.filter((r) => (r.lateMinutes || 0) > 0).length)
const onLeaveToday = computed(() => todayRecords.value.filter((r) => r.status === 2).length)

const pendingLeaves = computed(() => attStore.pendingLeaves as any[])

onMounted(async () => {
  await Promise.all([
    empStore.fetchEmployees({ pageSize: 1000 }),
    deptStore.fetchDepartmentTree(),
    attStore.fetchAttendance(undefined, curMonth, curYear),
    attStore.fetchPendingLeaves(),
  ])
})
</script>

<template>
  <div class="space-y-6 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12 flex flex-col min-h-[calc(100vh-100px)]">
    <!-- Header -->
    <div>
      <h1 class="font-display text-4xl mb-1 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Tổng quan quản lý</h1>
      <p class="text-muted-foreground font-sans text-lg">
        Phòng ban phụ trách:
        <span v-if="managedDeptNames.length" class="text-foreground font-medium">{{ managedDeptNames.join(', ') }}</span>
        <span v-else>—</span>
      </p>
    </div>

    <!-- KPI -->
    <ARow :gutter="[16, 16]">
      <ACol :xs="12" :lg="6">
        <ACard :bordered="false" class="shadow-md rounded-2xl h-full">
          <AStatistic title="Sĩ số phòng" :value="headcount" suffix="người" />
        </ACard>
      </ACol>
      <ACol :xs="12" :lg="6">
        <ACard :bordered="false" class="shadow-md rounded-2xl h-full">
          <AStatistic title="Có mặt hôm nay" :value="presentToday" suffix="người" :value-style="{ color: '#16a34a' }" />
        </ACard>
      </ACol>
      <ACol :xs="12" :lg="6">
        <ACard :bordered="false" class="shadow-md rounded-2xl h-full">
          <AStatistic title="Đi muộn hôm nay" :value="lateToday" suffix="người" :value-style="{ color: lateToday > 0 ? '#dc2626' : undefined }" />
        </ACard>
      </ACol>
      <ACol :xs="12" :lg="6">
        <ACard :bordered="false" class="shadow-md rounded-2xl h-full">
          <AStatistic title="Đơn nghỉ chờ duyệt" :value="pendingLeaves.length" suffix="đơn" :value-style="{ color: pendingLeaves.length > 0 ? '#d97706' : undefined }" />
        </ACard>
      </ACol>
    </ARow>

    <ARow :gutter="[16, 16]" class="flex-1">
      <!-- Đơn nghỉ chờ duyệt -->
      <ACol :xs="24" :lg="12">
        <ACard :bordered="false" class="shadow-md rounded-2xl h-full flex flex-col" :bodyStyle="{ flex: 1, display: 'flex', flexDirection: 'column' }">
          <template #title>
            Đơn nghỉ chờ duyệt
            <ATag v-if="pendingLeaves.length" color="orange" class="ml-2">{{ pendingLeaves.length }}</ATag>
          </template>
          <div v-if="pendingLeaves.length">
            <div v-for="l in pendingLeaves.slice(0, 6)" :key="l.id" class="py-2 border-t border-border/60 first:border-t-0">
              <div class="flex items-center justify-between">
                <span class="font-sans text-sm font-medium text-foreground">{{ empMap[l.employeeId]?.name || 'NV ' + String(l.employeeId).slice(0, 8) }}</span>
                <ATag :color="LEAVE_STATUS[l.status]?.color">{{ LEAVE_STATUS[l.status]?.label }}</ATag>
              </div>
              <div class="font-mono text-xs text-muted-foreground mt-0.5">
                {{ l.leaveTypeName }} · {{ fmtDate(l.fromDate) }} → {{ fmtDate(l.toDate) }} · {{ l.totalDays }} ngày
              </div>
            </div>
          </div>
          <AEmpty v-else :image="undefined" description="Không có đơn chờ duyệt" class="m-auto" />
          <div class="pt-3 mt-auto">
            <RouterLink to="/attendance/leave-approval"><AButton size="small">Duyệt nghỉ phép</AButton></RouterLink>
          </div>
        </ACard>
      </ACol>

      <!-- Chấm công hôm nay -->
      <ACol :xs="24" :lg="12">
        <ACard :bordered="false" class="shadow-md rounded-2xl h-full flex flex-col" :bodyStyle="{ flex: 1, display: 'flex', flexDirection: 'column' }">
          <template #title>
            Chấm công hôm nay
            <span class="font-mono text-xs text-muted-foreground ml-2">{{ fmtDate(todayKey) }}</span>
          </template>
          <div v-if="todayRecords.length">
            <div class="flex items-center gap-4 mb-3 text-sm font-sans">
              <span class="text-muted-foreground">Đang nghỉ phép: <span class="text-foreground font-medium">{{ onLeaveToday }}</span></span>
              <span class="text-muted-foreground">Đã chấm: <span class="text-foreground font-medium">{{ todayRecords.length }}</span> / {{ headcount }}</span>
            </div>
            <div v-for="r in todayRecords.slice(0, 6)" :key="r.id" class="py-2 border-t border-border/60 first:border-t-0 flex items-center justify-between">
              <div>
                <div class="font-sans text-sm font-medium text-foreground">{{ empMap[r.employeeId]?.name || 'NV ' + String(r.employeeId).slice(0, 8) }}</div>
                <div class="font-mono text-xs text-muted-foreground">Vào {{ fmtTime(r.checkInTime) }} · Ra {{ fmtTime(r.checkOutTime) }}<span v-if="r.lateMinutes > 0" class="text-red-600"> · muộn {{ r.lateMinutes }}'</span></div>
              </div>
              <ATag :color="ATTENDANCE_STATUS[r.status]?.color">{{ ATTENDANCE_STATUS[r.status]?.label || r.status }}</ATag>
            </div>
          </div>
          <AEmpty v-else :image="undefined" description="Chưa có chấm công hôm nay" class="m-auto" />
          <div class="pt-3 mt-auto">
            <RouterLink to="/attendance/records"><AButton size="small">Bảng chấm công</AButton></RouterLink>
          </div>
        </ACard>
      </ACol>
    </ARow>

    <!-- Lối tắt -->
    <ACard title="Lối tắt" :bordered="false" class="shadow-md rounded-2xl">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <RouterLink to="/employees"><AButton block>Nhân viên phòng</AButton></RouterLink>
        <RouterLink to="/attendance/records"><AButton block>Bảng chấm công</AButton></RouterLink>
        <RouterLink to="/attendance/leave-approval"><AButton block>Duyệt nghỉ phép</AButton></RouterLink>
        <RouterLink to="/departments"><AButton block>Phòng ban</AButton></RouterLink>
      </div>
    </ACard>
  </div>
</template>
