<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Tag as ATag, Popconfirm as APopconfirm, Input as AInput, Select as ASelect, Table as ATable, Segmented as ASegmented, message } from 'ant-design-vue'
import { CalculatorIcon, RefreshCwIcon, CheckIcon, BanknoteIcon, XIcon, PrinterIcon } from 'lucide-vue-next'
import { usePayrollStore } from '../stores/payroll'
import { useEmployeeStore } from '../stores/employee'
import Button from '../components/ui/Button.vue'
import DataTableShell from '../components/ui/DataTableShell.vue'
import PayslipModal from '../components/PayslipModal.vue'

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
// Lọc trạng thái: chọn nhiều (multi-select), mảng rỗng = không lọc
const fStatuses = ref<number[]>([])
const statusOptions = [
  { label: 'Chờ duyệt', value: 0 },
  { label: 'Đã duyệt', value: 1 },
  { label: 'Đã chi trả', value: 2 },
]

const hasFilter = computed(() => !!keyword.value || fStatuses.value.length > 0)

function clearFilters() {
  keyword.value = ''
  fStatuses.value = []
}

// map employeeId -> { code, name, department } để hiển thị tên thay vì GUID
const empMap = computed<Record<string, { code: string; name: string; department: string }>>(() => {
  const m: Record<string, { code: string; name: string; department: string }> = {}
  for (const e of empStore.allEmployees as any[]) {
    if (e.id) m[e.id] = { code: e.employeeCode, name: e.fullName, department: e.departmentName || '' }
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
    if (fStatuses.value.length && !fStatuses.value.includes(p.status)) return false
    if (!kw) return true
    const info = empMap.value[p.employeeId]
    const name = (info?.name || '').toLowerCase()
    const code = (info?.code || '').toLowerCase()
    return name.includes(kw) || code.includes(kw) || (p.employeeId || '').toLowerCase().includes(kw)
  })
})

// Dòng tổng (sổ lương): cộng dồn trên đúng tập đang lọc
const totals = computed(() => {
  const t = { count: 0, baseSalary: 0, totalAllowances: 0, totalDeductions: 0, netSalary: 0 }
  for (const p of filteredPayrolls.value) {
    t.count++
    t.baseSalary += p.baseSalary ?? 0
    t.totalAllowances += p.totalAllowances ?? 0
    t.totalDeductions += p.totalDeductions ?? 0
    t.netSalary += p.netSalary ?? 0
  }
  return t
})

const columns = computed<any[]>(() => [
  { title: 'Nhân viên', key: 'employee', dataIndex: 'employeeId' },
  { title: 'Phòng ban', key: 'department', align: 'left', width: 160, sorter: (a: any, b: any) => (empMap.value[a.employeeId]?.department || '').localeCompare(empMap.value[b.employeeId]?.department || '') },
  { title: 'Kỳ', key: 'period', align: 'center', width: 100, sorter: (a: any, b: any) => (a.year - b.year) || (a.month - b.month) },
  { title: 'Lương cơ bản', key: 'baseSalary', dataIndex: 'baseSalary', align: 'right', sorter: (a: any, b: any) => (a.baseSalary ?? 0) - (b.baseSalary ?? 0) },
  { title: 'Phụ cấp', key: 'totalAllowances', dataIndex: 'totalAllowances', align: 'right', sorter: (a: any, b: any) => (a.totalAllowances ?? 0) - (b.totalAllowances ?? 0) },
  { title: 'Khấu trừ', key: 'totalDeductions', dataIndex: 'totalDeductions', align: 'right', sorter: (a: any, b: any) => (a.totalDeductions ?? 0) - (b.totalDeductions ?? 0) },
  { title: 'Thực lãnh', key: 'netSalary', dataIndex: 'netSalary', align: 'right', sorter: (a: any, b: any) => (a.netSalary ?? 0) - (b.netSalary ?? 0) },
  { title: 'Trạng thái', key: 'status', dataIndex: 'status', align: 'center', width: 130 },
  { title: '', key: 'actions', align: 'right', width: 190 },
])

// In phiếu lương
const printOpen = ref(false)
const printRecord = ref<any | null>(null)
const printEmp = ref<any | null>(null)
function openPrint(record: any) {
  printRecord.value = record
  printEmp.value = (empStore.allEmployees as any[]).find((e) => e.id === record.employeeId) || null
  printOpen.value = true
}

const tablePagination = computed(() => ({
  pageSize: 20,
  showSizeChanger: true,
  pageSizeOptions: ['20', '50', '100'],
  showTotal: (t: number) => `${t} bảng lương`,
}))

// ===== Chế độ hiển thị: Danh sách hoặc Kanban =====
const viewMode = ref<'list' | 'kanban'>('list')
const KANBAN_COLS = [
  { s: 0, label: 'Chờ duyệt', dot: 'bg-amber-400' },
  { s: 1, label: 'Đã duyệt', dot: 'bg-blue-500' },
  { s: 2, label: 'Đã chi trả', dot: 'bg-emerald-500' },
]
// Kanban: lọc theo tìm kiếm nhưng KHÔNG lọc trạng thái (để thấy đủ 3 cột)
const boardPayrolls = computed<any[]>(() => {
  const kw = keyword.value.trim().toLowerCase()
  return (store.payrolls as any[]).filter((p) => {
    if (!kw) return true
    const info = empMap.value[p.employeeId]
    return (info?.name || '').toLowerCase().includes(kw) || (info?.code || '').toLowerCase().includes(kw)
  })
})
const groupedPayrolls = computed<Record<number, any[]>>(() => ({
  0: boardPayrolls.value.filter((p) => p.status === 0),
  1: boardPayrolls.value.filter((p) => p.status === 1),
  2: boardPayrolls.value.filter((p) => p.status === 2),
}))
const payrollsIn = (s: number): any[] => groupedPayrolls.value[s] ?? []

// ===== Kéo-thả (drag & drop) =====
const dragId = ref<string | null>(null)
function onDragStart(p: any) {
  if (p.status === 2) return // đã chi trả thì không kéo
  dragId.value = p.id
}
function onDrop(targetStatus: number) {
  const id = dragId.value
  dragId.value = null
  if (!id) return
  const p = (store.payrolls as any[]).find((x) => x.id === id)
  if (!p) return
  if (p.status === 0 && targetStatus === 1) approve(id) // Chờ duyệt → Đã duyệt
  else if (p.status === 1 && targetStatus === 2) pay(id) // Đã duyệt → Đã chi trả
}
// Cột có phải đích hợp lệ cho thẻ đang kéo không (để tô sáng)
function validTarget(targetStatus: number): boolean {
  if (!dragId.value) return false
  const p = (store.payrolls as any[]).find((x) => x.id === dragId.value)
  if (!p) return false
  return (p.status === 0 && targetStatus === 1) || (p.status === 1 && targetStatus === 2)
}

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

// ===== CHỌN NHIỀU + THAO TÁC HÀNG LOẠT =====
const selectedIds = ref<string[]>([])
const rowSelection = computed(() => ({
  selectedRowKeys: selectedIds.value,
  onChange: (keys: any[]) => { selectedIds.value = keys as string[] },
}))

// map id -> record để xác định trạng thái dòng đã chọn
const payrollById = computed<Record<string, any>>(() => {
  const m: Record<string, any> = {}
  for (const p of store.payrolls as any[]) m[p.id] = p
  return m
})

// Danh sách id đủ điều kiện cho từng thao tác (lọc theo trạng thái dòng đã chọn)
const approvableIds = computed<string[]>(() =>
  selectedIds.value.filter((id) => payrollById.value[id]?.status === 0),
)
const payableIds = computed<string[]>(() =>
  selectedIds.value.filter((id) => payrollById.value[id]?.status === 1),
)

const batchRunning = ref(false)

async function runBatch(ids: string[], fn: (id: string) => Promise<boolean>) {
  let ok = 0
  for (const id of ids) {
    if (await fn(id)) ok++
  }
  return ok
}

async function batchApprove() {
  const ids = [...approvableIds.value]
  if (!ids.length) return
  batchRunning.value = true
  try {
    const approved = await runBatch(ids, (id) => store.approvePayroll(id))
    await load()
    selectedIds.value = []
    message.success(`Đã duyệt ${approved}/${ids.length} phiếu`)
  } finally {
    batchRunning.value = false
  }
}

async function batchPay() {
  const ids = [...payableIds.value]
  if (!ids.length) return
  batchRunning.value = true
  try {
    const paid = await runBatch(ids, (id) => store.payPayroll(id))
    await load()
    selectedIds.value = []
    message.success(`Đã chi trả ${paid}/${ids.length} phiếu`)
  } finally {
    batchRunning.value = false
  }
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
    :row-selection="rowSelection"
    :scroll-x="1260"
  >
    <!-- Header actions -->
    <template #actions>
      <ASegmented
        v-model:value="viewMode"
        :options="[{ label: 'Danh sách', value: 'list' }, { label: 'Kanban', value: 'kanban' }]"
      />
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
        <a-input v-model:value="keyword" placeholder="Tìm theo tên, mã nhân viên..." style="width:100%" />
      </div>
      <a-select v-model:value="month" :options="months" style="min-width: 120px" />
      <a-select v-model:value="year" :options="years" style="min-width: 100px" />
      <ASelect
        v-model:value="fStatuses" mode="multiple" :options="statusOptions" allow-clear :max-tag-count="2"
        placeholder="Trạng thái" class="hr-multi" style="min-width: 180px"
      />
      <button
        v-if="hasFilter"
        @click="clearFilters"
        class="h-9 px-3 inline-flex items-center gap-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-sm transition-all"
        title="Xóa toàn bộ bộ lọc"
      >
        <XIcon class="w-4 h-4" /> Xóa lọc
      </button>
    </template>

    <!-- Banner: lỗi + dòng tổng (sổ lương) -->
    <template #banner>
      <div v-if="store.error" class="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
        {{ store.error }}
      </div>

      <!-- Thanh thao tác hàng loạt -->
      <div v-if="selectedIds.length > 0" class="bg-accent/10 border border-accent/20 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 font-sans">
        <span class="text-accent font-medium text-sm">Đã chọn {{ selectedIds.length }} phiếu lương</span>
        <div class="flex items-center gap-2">
          <APopconfirm
            :title="`Duyệt ${approvableIds.length} phiếu đang chờ duyệt?`"
            ok-text="Duyệt" cancel-text="Hủy"
            :disabled="batchRunning || approvableIds.length === 0"
            @confirm="batchApprove"
          >
            <button
              :disabled="batchRunning || approvableIds.length === 0"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckIcon class="w-4 h-4" /> Duyệt {{ approvableIds.length }} phiếu
            </button>
          </APopconfirm>
          <APopconfirm
            :title="`Chi trả ${payableIds.length} phiếu đã duyệt?`"
            ok-text="Chi trả" cancel-text="Hủy"
            :disabled="batchRunning || payableIds.length === 0"
            @confirm="batchPay"
          >
            <button
              :disabled="batchRunning || payableIds.length === 0"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <BanknoteIcon class="w-4 h-4" /> Chi trả {{ payableIds.length }} phiếu
            </button>
          </APopconfirm>
          <button
            @click="selectedIds = []"
            class="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Bỏ chọn
          </button>
        </div>
      </div>

      <div class="bg-card border border-border rounded-xl p-3 font-sans">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <div class="text-xs text-muted-foreground">Số bảng lương</div>
            <div class="text-base font-semibold text-foreground">{{ totals.count }}</div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground">Tổng lương cơ bản</div>
            <div class="text-base font-mono font-medium text-foreground">{{ vnd(totals.baseSalary) }}</div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground">Tổng phụ cấp</div>
            <div class="text-base font-mono font-medium text-emerald-600">{{ vnd(totals.totalAllowances) }}</div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground">Tổng khấu trừ</div>
            <div class="text-base font-mono font-medium text-red-600">{{ vnd(totals.totalDeductions) }}</div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground">Tổng thực lãnh</div>
            <div class="text-base font-mono font-bold text-accent">{{ vnd(totals.netSalary) }}</div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== DANH SÁCH (bảng) ===== -->
    <div v-if="viewMode === 'list'" class="bg-card border border-border rounded-xl shadow-sm overflow-hidden hr-table-wrap">
      <a-table :columns="columns" :data-source="filteredPayrolls" :loading="store.isLoading" row-key="id" :pagination="tablePagination" :row-selection="rowSelection" :scroll="{ x: 1260 }" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'employee'">
            <div class="font-sans">
              <div class="font-medium text-foreground">{{ empMap[record.employeeId]?.name || 'NV chưa đồng bộ' }}</div>
              <div class="font-mono text-xs text-muted-foreground">{{ empMap[record.employeeId]?.code || record.employeeId.slice(0, 8) }}</div>
            </div>
          </template>
          <template v-else-if="column.key === 'department'">
            <span class="font-sans text-sm text-foreground">{{ empMap[record.employeeId]?.department || '—' }}</span>
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
            <div class="flex items-center justify-end gap-1">
              <APopconfirm v-if="record.status === 0" title="Duyệt bảng lương này?" ok-text="Duyệt" cancel-text="Hủy" @confirm="approve(record.id)">
                <button class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"><CheckIcon class="w-3.5 h-3.5" /> Duyệt</button>
              </APopconfirm>
              <APopconfirm v-else-if="record.status === 1" title="Xác nhận chi trả?" ok-text="Chi trả" cancel-text="Hủy" @confirm="pay(record.id)">
                <button class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"><BanknoteIcon class="w-3.5 h-3.5" /> Chi trả</button>
              </APopconfirm>
              <span v-else class="text-xs text-muted-foreground italic mr-1">Hoàn tất</span>
              <button @click="openPrint(record)" class="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-all" title="In phiếu lương"><PrinterIcon class="w-4 h-4" /></button>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <!-- ===== KANBAN ===== -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="col in KANBAN_COLS" :key="col.s"
        class="bg-muted/30 border border-border rounded-xl p-3 flex flex-col transition-all"
        :class="validTarget(col.s) ? 'ring-2 ring-accent/40 bg-accent/5' : ''"
        @dragover.prevent
        @drop="onDrop(col.s)"
      >
        <div class="flex items-center gap-2 px-1 pb-2 mb-1 border-b border-border/60">
          <span class="w-2.5 h-2.5 rounded-full" :class="col.dot"></span>
          <span class="font-semibold text-foreground text-sm">{{ col.label }}</span>
          <span class="ml-auto text-xs font-mono text-muted-foreground">{{ payrollsIn(col.s).length }}</span>
        </div>
        <div class="space-y-2.5 overflow-y-auto" style="max-height: calc(100vh - 320px)">
          <div
            v-for="p in payrollsIn(col.s)" :key="p.id"
            class="bg-card border border-border rounded-lg p-3 shadow-sm"
            :class="p.status !== 2 ? 'cursor-grab active:cursor-grabbing hover:border-accent/40' : ''"
            :draggable="p.status !== 2"
            @dragstart="onDragStart(p)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-medium text-foreground text-sm truncate">{{ empMap[p.employeeId]?.name || 'NV chưa đồng bộ' }}</div>
                <div class="font-mono text-[11px] text-muted-foreground">{{ empMap[p.employeeId]?.code || p.employeeId.slice(0, 8) }} · {{ p.month }}/{{ p.year }}</div>
              </div>
              <button @click="openPrint(p)" class="shrink-0 p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-all" title="In phiếu lương"><PrinterIcon class="w-4 h-4" /></button>
            </div>
            <div class="mt-2 flex items-baseline justify-between">
              <span class="text-xs text-muted-foreground">Thực lãnh</span>
              <span class="font-mono font-bold text-accent">{{ vnd(p.netSalary) }}</span>
            </div>
            <div v-if="p.status === 0" class="mt-2.5">
              <APopconfirm title="Duyệt bảng lương này?" ok-text="Duyệt" cancel-text="Hủy" @confirm="approve(p.id)">
                <button class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors"><CheckIcon class="w-3.5 h-3.5" /> Duyệt</button>
              </APopconfirm>
            </div>
            <div v-else-if="p.status === 1" class="mt-2.5">
              <APopconfirm title="Xác nhận chi trả?" ok-text="Chi trả" cancel-text="Hủy" @confirm="pay(p.id)">
                <button class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-colors"><BanknoteIcon class="w-3.5 h-3.5" /> Chi trả</button>
              </APopconfirm>
            </div>
          </div>
          <div v-if="payrollsIn(col.s).length === 0" class="text-center text-xs text-muted-foreground py-6">Trống</div>
        </div>
      </div>
    </div>
  </DataTableShell>

  <PayslipModal :open="printOpen" :payroll="printRecord" :employee="printEmp" @close="printOpen = false" />
</template>

<style scoped>
.hr-multi :deep(.ant-select-selector) {
  border-radius: 0.5rem;
  min-height: 36px;
}
.hr-table-wrap :deep(.ant-table-thead > tr > th) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
  font-weight: 600;
  background: rgba(241, 245, 249, 0.5);
}
</style>
