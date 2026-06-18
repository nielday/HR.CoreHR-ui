<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Select as ASelect, Table as ATable, Tag as ATag, Popconfirm as APopconfirm, message } from 'ant-design-vue'
import { CalculatorIcon, RefreshCwIcon, CheckIcon, BanknoteIcon } from 'lucide-vue-next'
import { usePayrollStore } from '../stores/payroll'
import { useEmployeeStore } from '../stores/employee'
import Button from '../components/ui/Button.vue'

const store = usePayrollStore()
const empStore = useEmployeeStore()

const now = new Date()
const month = ref<number>(now.getMonth() + 1)
const year = ref<number>(now.getFullYear())

const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
const years = Array.from({ length: 6 }, (_, i) => ({ value: now.getFullYear() - 3 + i, label: `${now.getFullYear() - 3 + i}` }))

const vnd = (n: number) => (n ?? 0).toLocaleString('vi-VN') + ' ₫'

// map employeeId -> { code, name } để hiển thị tên thay vì GUID
const empMap = computed<Record<string, { code: string; name: string }>>(() => {
  const m: Record<string, { code: string; name: string }> = {}
  for (const e of empStore.allEmployees as any[]) {
    if (e.id) m[e.id] = { code: e.employeeCode, name: e.fullName }
  }
  return m
})

const STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Chờ duyệt', color: 'orange' },
  1: { label: 'Đã duyệt', color: 'blue' },
  2: { label: 'Đã chi trả', color: 'green' },
}

const columns = [
  { title: 'Nhân viên', key: 'employee' },
  { title: 'Kỳ', key: 'period', align: 'center' as const, width: 100 },
  { title: 'Lương cơ bản', key: 'baseSalary', align: 'right' as const },
  { title: 'Phụ cấp', key: 'totalAllowances', align: 'right' as const },
  { title: 'Khấu trừ', key: 'totalDeductions', align: 'right' as const },
  { title: 'Thực lãnh', key: 'netSalary', align: 'right' as const },
  { title: 'Trạng thái', key: 'status', align: 'center' as const, width: 130 },
  { title: '', key: 'actions', align: 'right' as const, width: 140 },
]

async function load() {
  await Promise.all([
    store.fetchPayrolls(month.value, year.value),
    empStore.allEmployees.length ? Promise.resolve() : empStore.fetchAllEmployees(),
  ])
}

async function runCalculate() {
  const ok = await store.calculatePayroll(month.value, year.value)
  if (ok) { message.success(`Đã tính lương tháng ${month.value}/${year.value}`); await load() }
  else message.error(store.error || 'Tính lương thất bại')
}

async function approve(id: string) {
  const ok = await store.approvePayroll(id)
  ok ? message.success('Đã duyệt') : message.error(store.error || 'Duyệt thất bại')
}
async function pay(id: string) {
  const ok = await store.payPayroll(id)
  ok ? message.success('Đã chi trả') : message.error(store.error || 'Chi trả thất bại')
}

onMounted(load)
watch([month, year], () => store.fetchPayrolls(month.value, year.value))
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Bảng lương</h1>
        <p class="text-muted-foreground font-sans text-lg">Danh sách lương theo kỳ, duyệt và chi trả.</p>
      </div>
      <div class="flex items-center gap-3">
        <ASelect v-model:value="month" :options="months" style="width: 120px" size="large" />
        <ASelect v-model:value="year" :options="years" style="width: 110px" size="large" />
        <Button @click="runCalculate" :disabled="store.isLoading" class="shadow-accent">
          <CalculatorIcon class="w-4 h-4 mr-2" />
          {{ store.isLoading ? 'Đang xử lý...' : 'Tính lương' }}
        </Button>
        <button @click="load" class="p-3 rounded-xl border border-border text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors" title="Tải lại">
          <RefreshCwIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div v-if="store.error" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">{{ store.error }}</div>

    <div class="bg-card border border-border rounded-2xl shadow-md p-6">
      <ATable :columns="columns" :data-source="store.payrolls" :loading="store.isLoading" row-key="id" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'employee'">
            <div class="font-sans">
              <div class="font-medium text-foreground">{{ empMap[record.employeeId]?.name || 'NV chưa đồng bộ' }}</div>
              <div class="font-mono text-xs text-muted-foreground">{{ empMap[record.employeeId]?.code || record.employeeId.slice(0, 8) }}</div>
            </div>
          </template>
          <template v-else-if="column.key === 'period'"><span class="font-mono text-sm">{{ record.month }}/{{ record.year }}</span></template>
          <template v-else-if="column.key === 'baseSalary'"><span class="font-mono text-sm">{{ vnd(record.baseSalary) }}</span></template>
          <template v-else-if="column.key === 'totalAllowances'"><span class="font-mono text-sm text-emerald-600">{{ vnd(record.totalAllowances) }}</span></template>
          <template v-else-if="column.key === 'totalDeductions'"><span class="font-mono text-sm text-red-600">{{ vnd(record.totalDeductions) }}</span></template>
          <template v-else-if="column.key === 'netSalary'"><span class="font-mono text-sm font-semibold text-accent">{{ vnd(record.netSalary) }}</span></template>
          <template v-else-if="column.key === 'status'">
            <ATag :color="STATUS[record.status]?.color">{{ STATUS[record.status]?.label || record.status }}</ATag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <APopconfirm v-if="record.status === 0" title="Duyệt bảng lương này?" ok-text="Duyệt" cancel-text="Hủy" @confirm="approve(record.id)">
              <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"><CheckIcon class="w-3.5 h-3.5" /> Duyệt</button>
            </APopconfirm>
            <APopconfirm v-else-if="record.status === 1" title="Xác nhận chi trả?" ok-text="Chi trả" cancel-text="Hủy" @confirm="pay(record.id)">
              <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"><BanknoteIcon class="w-3.5 h-3.5" /> Chi trả</button>
            </APopconfirm>
            <span v-else class="text-xs text-muted-foreground italic">Hoàn tất</span>
          </template>
        </template>
      </ATable>
    </div>
  </div>
</template>
