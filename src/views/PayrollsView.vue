<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Tag as ATag, Popconfirm as APopconfirm, message } from 'ant-design-vue'
import { CalculatorIcon, RefreshCwIcon, CheckIcon, BanknoteIcon } from 'lucide-vue-next'
import { usePayrollStore } from '../stores/payroll'
import { useEmployeeStore } from '../stores/employee'
import Button from '../components/ui/Button.vue'
import DataTableShell from '../components/ui/DataTableShell.vue'

const store = usePayrollStore()
const empStore = useEmployeeStore()

const now = new Date()
const month = ref<number>(now.getMonth() + 1)
const year = ref<number>(now.getFullYear())

const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
const years = Array.from({ length: 6 }, (_, i) => ({ value: now.getFullYear() - 3 + i, label: `${now.getFullYear() - 3 + i}` }))

const vnd = (n: number) => (n ?? 0).toLocaleString('vi-VN') + ' ₫'

// Tìm kiếm + lọc client-side
const keyword = ref('')
const statusFilter = ref<string>('')

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

// Lọc theo tên/mã nhân viên + trạng thái (client-side)
const filteredPayrolls = computed<any[]>(() => {
  const kw = keyword.value.trim().toLowerCase()
  return (store.payrolls as any[]).filter((p) => {
    if (statusFilter.value !== '' && p.status !== Number(statusFilter.value)) return false
    if (!kw) return true
    const info = empMap.value[p.employeeId]
    const name = (info?.name || '').toLowerCase()
    const code = (info?.code || '').toLowerCase()
    return name.includes(kw) || code.includes(kw) || (p.employeeId || '').toLowerCase().includes(kw)
  })
})

const columns = computed<any[]>(() => [
  { title: 'Nhân viên', key: 'employee', dataIndex: 'employeeId' },
  { title: 'Kỳ', key: 'period', align: 'center', width: 100, sorter: (a: any, b: any) => (a.year - b.year) || (a.month - b.month) },
  { title: 'Lương cơ bản', key: 'baseSalary', dataIndex: 'baseSalary', align: 'right', sorter: (a: any, b: any) => (a.baseSalary ?? 0) - (b.baseSalary ?? 0) },
  { title: 'Phụ cấp', key: 'totalAllowances', dataIndex: 'totalAllowances', align: 'right', sorter: (a: any, b: any) => (a.totalAllowances ?? 0) - (b.totalAllowances ?? 0) },
  { title: 'Khấu trừ', key: 'totalDeductions', dataIndex: 'totalDeductions', align: 'right', sorter: (a: any, b: any) => (a.totalDeductions ?? 0) - (b.totalDeductions ?? 0) },
  { title: 'Thực lãnh', key: 'netSalary', dataIndex: 'netSalary', align: 'right', sorter: (a: any, b: any) => (a.netSalary ?? 0) - (b.netSalary ?? 0) },
  { title: 'Trạng thái', key: 'status', dataIndex: 'status', align: 'center', width: 130 },
  { title: '', key: 'actions', align: 'right', width: 140 },
])

const tablePagination = computed(() => ({
  pageSize: 20,
  showSizeChanger: true,
  pageSizeOptions: ['20', '50', '100'],
  showTotal: (t: number) => `${t} bảng lương`,
}))

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
  <DataTableShell
    title="Bảng lương"
    subtitle="Danh sách lương theo kỳ, duyệt và chi trả."
    :columns="columns"
    :data-source="filteredPayrolls"
    :loading="store.isLoading"
    row-key="id"
    :pagination="tablePagination"
    :scroll-x="1100"
  >
    <!-- Header actions -->
    <template #actions>
      <Button @click="runCalculate" :disabled="store.isLoading" class="shadow-accent">
        <CalculatorIcon class="w-4 h-4 mr-2" />
        {{ store.isLoading ? 'Đang xử lý...' : 'Tính lương' }}
      </Button>
      <button @click="load" class="p-2.5 rounded-lg border border-border text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors" title="Tải lại">
        <RefreshCwIcon class="w-4 h-4" />
      </button>
    </template>

    <!-- Filters -->
    <template #filters>
      <div class="relative w-full sm:w-64">
        <input
          v-model="keyword"
          type="text"
          placeholder="Tìm theo tên, mã nhân viên..."
          class="w-full h-9 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"
        />
      </div>
      <select v-model="month" class="h-9 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
        <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
      <select v-model="year" class="h-9 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
        <option v-for="y in years" :key="y.value" :value="y.value">{{ y.label }}</option>
      </select>
      <select v-model="statusFilter" class="h-9 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
        <option value="">Tất cả trạng thái</option>
        <option value="0">Chờ duyệt</option>
        <option value="1">Đã duyệt</option>
        <option value="2">Đã chi trả</option>
      </select>
    </template>

    <!-- Banner: lỗi -->
    <template #banner>
      <div v-if="store.error" class="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
        {{ store.error }}
      </div>
    </template>

    <!-- Body cells -->
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
  </DataTableShell>
</template>
