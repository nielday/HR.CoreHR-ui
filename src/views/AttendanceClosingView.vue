<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Select as ASelect, Table as ATable, Tag as ATag, Popconfirm as APopconfirm, message } from 'ant-design-vue'
import { LockIcon, RefreshCwIcon } from 'lucide-vue-next'
import { useAttendanceStore } from '../stores/attendance'
import { useEmployeeStore } from '../stores/employee'
import Button from '../components/ui/Button.vue'

const store = useAttendanceStore()
const empStore = useEmployeeStore()

const now = new Date()
const month = ref<number>(now.getMonth() + 1)
const year = ref<number>(now.getFullYear())

const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
const years = Array.from({ length: 6 }, (_, i) => ({ value: now.getFullYear() - 3 + i, label: `${now.getFullYear() - 3 + i}` }))

// map employeeId -> { code, name } để hiển thị tên thay vì GUID
const empMap = computed<Record<string, { code: string; name: string }>>(() => {
  const m: Record<string, { code: string; name: string }> = {}
  for (const e of empStore.employees as any[]) {
    if (e.id) m[e.id] = { code: e.employeeCode, name: e.fullName }
  }
  return m
})

const columns = [
  { title: 'Nhân viên', key: 'employee' },
  { title: 'Công chuẩn', key: 'standardWorkdays', align: 'center' as const, width: 110 },
  { title: 'Ngày công', key: 'actualWorkdays', align: 'center' as const, width: 110 },
  { title: 'Tổng giờ', key: 'totalWorkedHours', align: 'right' as const, width: 110 },
  { title: 'Tăng ca', key: 'overtimeHours', align: 'right' as const, width: 100 },
  { title: 'Phép có lương', key: 'paidLeaveDays', align: 'center' as const, width: 120 },
  { title: 'Phép không lương', key: 'unpaidLeaveDays', align: 'center' as const, width: 140 },
  { title: 'Vắng', key: 'absentDays', align: 'center' as const, width: 90 },
  { title: 'Đã chốt', key: 'isClosed', align: 'center' as const, width: 120 },
]

async function reload() {
  await store.fetchSummary(month.value, year.value)
}

async function closeMonth() {
  const ok = await store.closeMonth(month.value, year.value)
  if (ok) {
    message.success(`Đã chốt công tháng ${month.value}/${year.value}`)
    await store.fetchSummary(month.value, year.value)
  } else {
    message.error(store.error || 'Chốt công thất bại')
  }
}

onMounted(async () => {
  if (!empStore.employees.length) empStore.fetchEmployees({ pageSize: 1000 })
  await reload()
})
watch([month, year], reload)
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Chốt công</h1>
        <p class="text-muted-foreground font-sans text-lg">Tổng hợp công tháng và chốt sổ chấm công cho toàn bộ nhân viên.</p>
      </div>
      <div class="flex items-center gap-3">
        <ASelect v-model:value="month" :options="months" style="width: 120px" size="large" />
        <ASelect v-model:value="year" :options="years" style="width: 110px" size="large" />
        <APopconfirm
          :title="`Chốt công tháng ${month}/${year}? Thao tác này khóa sổ chấm công của tháng.`"
          ok-text="Chốt công"
          cancel-text="Hủy"
          @confirm="closeMonth"
        >
          <Button :disabled="store.isLoading" class="shadow-accent">
            <LockIcon class="w-4 h-4 mr-2" />
            {{ store.isLoading ? 'Đang xử lý...' : 'Chốt công tháng' }}
          </Button>
        </APopconfirm>
        <button @click="reload" class="p-3 rounded-xl border border-border text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors" title="Tải lại">
          <RefreshCwIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div v-if="store.error" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">{{ store.error }}</div>

    <div class="bg-card border border-border rounded-2xl shadow-md p-6">
      <ATable :columns="columns" :data-source="store.summaries" :loading="store.isLoading" row-key="id" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'employee'">
            <div class="font-sans">
              <div class="font-medium text-foreground">{{ empMap[record.employeeId]?.name || 'NV chưa đồng bộ' }}</div>
              <div class="font-mono text-xs text-muted-foreground">{{ empMap[record.employeeId]?.code || record.employeeId.slice(0, 8) }}</div>
            </div>
          </template>
          <template v-else-if="column.key === 'standardWorkdays'"><span class="font-mono text-sm">{{ record.standardWorkdays }}</span></template>
          <template v-else-if="column.key === 'actualWorkdays'"><span class="font-mono text-sm font-semibold text-foreground">{{ record.actualWorkdays }}</span></template>
          <template v-else-if="column.key === 'totalWorkedHours'"><span class="font-mono text-sm">{{ record.totalWorkedHours }}</span></template>
          <template v-else-if="column.key === 'overtimeHours'"><span class="font-mono text-sm text-amber-600">{{ record.overtimeHours }}</span></template>
          <template v-else-if="column.key === 'paidLeaveDays'"><span class="font-mono text-sm text-emerald-600">{{ record.paidLeaveDays }}</span></template>
          <template v-else-if="column.key === 'unpaidLeaveDays'"><span class="font-mono text-sm text-orange-600">{{ record.unpaidLeaveDays }}</span></template>
          <template v-else-if="column.key === 'absentDays'"><span class="font-mono text-sm text-red-600">{{ record.absentDays }}</span></template>
          <template v-else-if="column.key === 'isClosed'">
            <ATag :color="record.isClosed ? 'green' : 'orange'">{{ record.isClosed ? 'Đã chốt' : 'Chưa chốt' }}</ATag>
          </template>
        </template>
      </ATable>
    </div>
  </div>
</template>
