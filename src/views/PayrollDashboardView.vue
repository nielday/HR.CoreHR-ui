<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import { Statistic as AStatistic, Select as ASelect, Table as ATable, Segmented as ASegmented, message } from 'ant-design-vue'
import { Column } from '@antv/g2plot'
import { CalculatorIcon, RefreshCwIcon, UsersIcon, WalletIcon, PlusCircleIcon, MinusCircleIcon } from 'lucide-vue-next'
import { usePayrollStore } from '../stores/payroll'
import { useDepartmentStore } from '../stores/department'
import Button from '../components/ui/Button.vue'

const store = usePayrollStore()
const deptStore = useDepartmentStore()

// Payroll chỉ lưu DepartmentId (không có tên phòng) → tra tên từ N1 (HR Core) theo Id.
const deptNameMap = computed<Record<string, string>>(() => {
  const m: Record<string, string> = {}
  for (const d of (deptStore.departments as any[])) {
    if (d.id) m[d.id] = d.departmentName
  }
  return m
})
const resolveDeptName = (row: any) =>
  (row.departmentId && deptNameMap.value[row.departmentId]) || row.departmentName || 'Chưa phân phòng'

const now = new Date()
const month = ref<number>(now.getMonth() + 1)
const year = ref<number>(now.getFullYear())

const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
const years = Array.from({ length: 6 }, (_, i) => ({ value: now.getFullYear() - 3 + i, label: `${now.getFullYear() - 3 + i}` }))

const vnd = (n: number) => (n ?? 0).toLocaleString('vi-VN') + ' ₫'

const byDept = computed(() => store.dashboard?.byDepartment ?? [])

// ===== Gộp theo KHỐI (2 bậc: Ban Giám đốc + các khối cấp 1) =====
const viewMode = ref<'khoi' | 'chitiet'>('khoi')
const viewOptions = [
  { label: 'Theo khối', value: 'khoi' },
  { label: 'Chi tiết phòng', value: 'chitiet' },
]

// Map id -> department (kèm parentDepartmentId) để cuộn lên khối
const deptById = computed<Record<string, any>>(() => {
  const m: Record<string, any> = {}
  for (const d of (deptStore.departments as any[])) if (d.id) m[d.id] = d
  return m
})

// "Khối" = phòng cấp 1 (con trực tiếp của gốc). Phòng con/cháu cuộn lên khối; gốc tự là nhóm của nó.
function rollupTargetId(deptId: string | null | undefined): string | null {
  if (!deptId) return null
  const map = deptById.value
  let node = map[deptId]
  if (!node) return deptId
  // leo lên cho tới khi cha là GỐC (cha của cha = null)
  while (node.parentDepartmentId && map[node.parentDepartmentId] && map[node.parentDepartmentId].parentDepartmentId) {
    node = map[node.parentDepartmentId]
  }
  return node.id
}

// Cộng dồn quỹ lương/phụ cấp/khấu trừ/số NV của các phòng con vào khối
const rolledUp = computed(() => {
  const groups = new Map<string, any>()
  for (const row of byDept.value as any[]) {
    const tid = rollupTargetId(row.departmentId) || row.departmentName || 'unknown'
    const name = deptById.value[tid]?.departmentName || resolveDeptName(row)
    let g = groups.get(tid)
    if (!g) {
      g = { departmentId: tid, departmentName: name, employeeCount: 0, totalSalaryFund: 0, totalAllowances: 0, totalDeductions: 0 }
      groups.set(tid, g)
    }
    g.employeeCount += row.employeeCount || 0
    g.totalSalaryFund += row.totalSalaryFund || 0
    g.totalAllowances += row.totalAllowances || 0
    g.totalDeductions += row.totalDeductions || 0
  }
  return [...groups.values()].sort((a, b) => b.totalSalaryFund - a.totalSalaryFund)
})

// Dữ liệu đang hiển thị theo chế độ
const displayData = computed(() => (viewMode.value === 'khoi' ? rolledUp.value : byDept.value))

const deptColumns = [
  { title: 'Khối / Phòng ban', dataIndex: 'departmentName', key: 'departmentName' },
  { title: 'Số NV', dataIndex: 'employeeCount', key: 'employeeCount', align: 'right' as const },
  { title: 'Quỹ lương', dataIndex: 'totalSalaryFund', key: 'totalSalaryFund', align: 'right' as const },
  { title: 'Phụ cấp', dataIndex: 'totalAllowances', key: 'totalAllowances', align: 'right' as const },
  { title: 'Khấu trừ', dataIndex: 'totalDeductions', key: 'totalDeductions', align: 'right' as const },
]

let chart: Column | null = null
const chartEl = ref<HTMLElement | null>(null)

function renderChart() {
  const data = displayData.value.map((d: any) => ({ department: resolveDeptName(d), value: d.totalSalaryFund }))
  if (!chartEl.value) return
  if (!chart) {
    chart = new Column(chartEl.value, {
      data,
      xField: 'department',
      yField: 'value',
      columnWidthRatio: 0.5,
      color: '#0052FF',
      label: { position: 'top', formatter: (d: any) => (d.value / 1_000_000).toFixed(1) + 'M' },
      xAxis: { label: { autoRotate: true } },
      yAxis: { label: { formatter: (v: any) => (Number(v) / 1_000_000).toFixed(0) + 'M' } },
      tooltip: { formatter: (d: any) => ({ name: 'Quỹ lương', value: vnd(d.value) }) },
      meta: { value: { alias: 'Quỹ lương' } },
      animation: false,
    })
    chart.render()
  } else {
    chart.changeData(data)
  }
}

async function load() {
  await Promise.all([
    store.fetchDashboard(month.value, year.value),
    deptStore.departments.length ? Promise.resolve() : deptStore.fetchDepartments(),
  ])
  await nextTick()
  renderChart()
}

async function runCalculate() {
  const ok = await store.calculatePayroll(month.value, year.value)
  if (ok) {
    message.success(`Đã tính lương cho tháng ${month.value}/${year.value}`)
    await load()
  } else {
    message.error(store.error || 'Tính lương thất bại')
  }
}

onMounted(load)
watch([month, year], load)
watch(viewMode, () => nextTick(renderChart))
onBeforeUnmount(() => { chart?.destroy(); chart = null })
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Payroll Dashboard</h1>
        <p class="text-muted-foreground font-sans text-lg">Tổng quan lương theo tháng và phòng ban.</p>
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

    <div v-if="store.error" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <!-- KPI cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <div class="bg-card border border-border rounded-2xl shadow-md p-6 relative overflow-hidden">
        <div class="absolute -top-10 -right-10 w-28 h-28 bg-accent/5 rounded-full blur-2xl"></div>
        <div class="flex items-center gap-2 text-muted-foreground mb-3"><UsersIcon class="w-4 h-4" /><span class="font-mono text-[11px] uppercase tracking-widest">Số NV tính lương</span></div>
        <AStatistic :value="store.dashboard?.totalEmployeesProcessed ?? 0" :value-style="{ fontWeight: 700, color: '#0F172A' }" />
      </div>
      <div class="bg-card border border-border rounded-2xl shadow-md p-6 relative overflow-hidden">
        <div class="absolute -top-10 -right-10 w-28 h-28 bg-accent/5 rounded-full blur-2xl"></div>
        <div class="flex items-center gap-2 text-muted-foreground mb-3"><WalletIcon class="w-4 h-4" /><span class="font-mono text-[11px] uppercase tracking-widest">Tổng quỹ lương</span></div>
        <AStatistic :value="store.dashboard?.totalSalaryFund ?? 0" suffix="₫" :value-style="{ fontWeight: 700, color: '#0052FF' }" />
      </div>
      <div class="bg-card border border-border rounded-2xl shadow-md p-6 relative overflow-hidden">
        <div class="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl"></div>
        <div class="flex items-center gap-2 text-muted-foreground mb-3"><PlusCircleIcon class="w-4 h-4" /><span class="font-mono text-[11px] uppercase tracking-widest">Tổng phụ cấp</span></div>
        <AStatistic :value="store.dashboard?.totalAllowances ?? 0" suffix="₫" :value-style="{ fontWeight: 700, color: '#16a34a' }" />
      </div>
      <div class="bg-card border border-border rounded-2xl shadow-md p-6 relative overflow-hidden">
        <div class="absolute -top-10 -right-10 w-28 h-28 bg-red-500/5 rounded-full blur-2xl"></div>
        <div class="flex items-center gap-2 text-muted-foreground mb-3"><MinusCircleIcon class="w-4 h-4" /><span class="font-mono text-[11px] uppercase tracking-widest">Tổng khấu trừ</span></div>
        <AStatistic :value="store.dashboard?.totalDeductions ?? 0" suffix="₫" :value-style="{ fontWeight: 700, color: '#dc2626' }" />
      </div>
    </div>

    <!-- Chart -->
    <div class="bg-card border border-border rounded-2xl shadow-md p-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 class="font-display text-xl text-foreground">Quỹ lương {{ viewMode === 'khoi' ? 'theo khối' : 'theo phòng ban' }}</h2>
        <ASegmented v-model:value="viewMode" :options="viewOptions" />
      </div>
      <div v-if="byDept.length === 0" class="h-64 flex items-center justify-center text-muted-foreground font-sans text-sm">
        Chưa có dữ liệu lương cho tháng này. Bấm <strong class="mx-1">Tính lương</strong> để tạo.
      </div>
      <div v-show="byDept.length > 0" ref="chartEl" class="h-80"></div>
    </div>

    <!-- Per-department table -->
    <div class="bg-card border border-border rounded-2xl shadow-md p-6">
      <h2 class="font-display text-xl mb-4 text-foreground">Chi tiết {{ viewMode === 'khoi' ? 'theo khối' : 'theo phòng ban' }}</h2>
      <ATable :columns="deptColumns" :data-source="displayData" :pagination="false" :loading="store.isLoading" :row-key="(r: any) => r.departmentId || r.departmentName" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'departmentName'"><span class="font-sans font-medium text-foreground">{{ resolveDeptName(record) }}</span></template>
          <template v-else-if="column.key === 'totalSalaryFund'"><span class="font-mono font-semibold text-accent">{{ vnd(record.totalSalaryFund) }}</span></template>
          <template v-else-if="column.key === 'totalAllowances'"><span class="font-mono text-emerald-600">{{ vnd(record.totalAllowances) }}</span></template>
          <template v-else-if="column.key === 'totalDeductions'"><span class="font-mono text-red-600">{{ vnd(record.totalDeductions) }}</span></template>
        </template>
      </ATable>
    </div>
  </div>
</template>
