<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { InputNumber as AInputNumber, Tag as ATag, message } from 'ant-design-vue'
import { SaveIcon, SettingsIcon } from 'lucide-vue-next'
import { usePayrollStore } from '../stores/payroll'
import { useEmployeeStore } from '../stores/employee'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'
import DataTableShell from '../components/ui/DataTableShell.vue'

const store = usePayrollStore()
const empStore = useEmployeeStore()

const selectedEmployeeId = ref<string | undefined>(undefined)
const loadingConfig = ref(false)
const hasExisting = ref(false)
const configModalOpen = ref(false)

const search = ref('')
const deptFilter = ref('')
const statusFilter = ref('')

const form = ref({
  baseSalary: 0,
  mealAllowance: 0,
  transportAllowance: 0,
  insuranceDeduction: 0,
  otherDeductions: 0,
})

// Danh sách NV đang làm việc (bỏ người đã nghỉ)
const activeEmployees = computed<any[]>(() =>
  (empStore.allEmployees as any[]).filter((e) => e.workingStatus !== 'Resigned')
)

// Danh sách phòng ban cho bộ lọc
const departments = computed<string[]>(() => {
  const set = new Set<string>()
  for (const e of activeEmployees.value) set.add(e.departmentName || 'Chưa phân phòng')
  return [...set].sort((a, b) => a.localeCompare(b, 'vi'))
})

// Lọc client-side theo từ khoá + phòng ban
const filtered = computed<any[]>(() => {
  const q = search.value.trim().toLowerCase()
  return activeEmployees.value.filter((e) => {
    const dept = e.departmentName || 'Chưa phân phòng'
    if (deptFilter.value && dept !== deptFilter.value) return false
    if (q && !`${e.fullName} ${e.employeeCode}`.toLowerCase().includes(q)) return false
    return true
  })
})

const columns = computed<any[]>(() => [
  { title: 'Mã', dataIndex: 'employeeCode', key: 'employeeCode', width: 100, sorter: (a: any, b: any) => (a.employeeCode || '').localeCompare(b.employeeCode || '') },
  { title: 'Nhân viên', dataIndex: 'fullName', key: 'fullName', sorter: (a: any, b: any) => (a.fullName || '').localeCompare(b.fullName || '', 'vi') },
  { title: 'Phòng ban', dataIndex: 'departmentName', key: 'departmentName' },
  { title: 'Chức vụ', dataIndex: 'positionName', key: 'positionName' },
  { title: '', key: 'actions', width: 130, align: 'right' },
])

const pagination = {
  pageSize: 15,
  showSizeChanger: true,
  pageSizeOptions: ['15', '30', '50'],
  showTotal: (t: number) => `${t} mục`,
}

const selectedEmployee = computed(
  () => (empStore.allEmployees as any[]).find((e) => e.id === selectedEmployeeId.value) || null
)

const totalIncome = computed(
  () => form.value.baseSalary + form.value.mealAllowance + form.value.transportAllowance
)
const totalDeduction = computed(() => form.value.insuranceDeduction + form.value.otherDeductions)
const netSalary = computed(() => totalIncome.value - totalDeduction.value)
// Khấu trừ vượt tổng thu nhập → cấu hình không hợp lệ (thực lãnh âm)
const invalidConfig = computed(() => totalDeduction.value > totalIncome.value)
// Tỷ lệ khấu trừ trên thu nhập (cho thanh trực quan)
const deductionPercent = computed(() =>
  totalIncome.value > 0 ? Math.min(100, Math.round((totalDeduction.value / totalIncome.value) * 100)) : 0
)

const vnd = (n: number) => (n ?? 0).toLocaleString('vi-VN') + ' ₫'
const parser = (v: string) => v.replace(/[^\d]/g, '')
const formatter = (v: string | number | undefined) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

async function openConfig(record: any) {
  selectedEmployeeId.value = record.id
  configModalOpen.value = true
  loadingConfig.value = true
  const cfg = await store.fetchSalaryConfig(record.id)
  if (cfg) {
    hasExisting.value = true
    form.value = {
      baseSalary: cfg.baseSalary,
      mealAllowance: cfg.mealAllowance,
      transportAllowance: cfg.transportAllowance,
      insuranceDeduction: cfg.insuranceDeduction,
      otherDeductions: cfg.otherDeductions,
    }
  } else {
    hasExisting.value = false
    form.value = { baseSalary: 0, mealAllowance: 0, transportAllowance: 0, insuranceDeduction: 0, otherDeductions: 0 }
  }
  loadingConfig.value = false
}

async function save() {
  if (!selectedEmployeeId.value) { message.warning('Chọn nhân viên trước'); return }
  const res = await store.saveSalaryConfig({ employeeId: selectedEmployeeId.value, ...form.value })
  if (res) { message.success('Đã lưu cấu hình lương'); hasExisting.value = true; configModalOpen.value = false }
  else message.error(store.error || 'Lưu thất bại')
}

onMounted(() => { if (!empStore.allEmployees.length) empStore.fetchAllEmployees() })
</script>

<template>
  <DataTableShell
    title="Cấu hình lương"
    subtitle="Thiết lập lương cơ bản, phụ cấp và khấu trừ cho từng nhân viên."
    :columns="columns"
    :data-source="filtered"
    :loading="empStore.isLoading"
    row-key="id"
    :pagination="pagination"
    :scroll-x="800"
    show-search
    :search="search"
    search-placeholder="Tìm theo tên, mã nhân viên..."
    @update:search="search = $event"
  >
    <!-- Filters -->
    <template #filters>
      <select v-model="deptFilter" class="h-9 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
        <option value="">Tất cả phòng ban</option>
        <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
      </select>
    </template>

    <!-- Body cells -->
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'employeeCode'">
        <span class="font-mono text-foreground">{{ record.employeeCode }}</span>
      </template>
      <template v-else-if="column.key === 'fullName'">
        <span class="font-medium text-foreground">{{ record.fullName }}</span>
      </template>
      <template v-else-if="column.key === 'positionName'">{{ record.positionName || '—' }}</template>
      <template v-else-if="column.key === 'actions'">
        <div class="flex items-center justify-end gap-1">
          <button @click="openConfig(record)" class="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-all" title="Cấu hình lương">
            <SettingsIcon class="w-4 h-4" />
          </button>
        </div>
      </template>
    </template>
  </DataTableShell>

  <!-- Modal cấu hình lương -->
  <Modal :is-open="configModalOpen" title="Cấu hình lương nhân viên" max-width="3xl" @close="configModalOpen = false">
    <div class="space-y-6">
      <!-- Header NV -->
      <div class="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div class="min-w-0">
          <div class="font-display text-2xl text-foreground truncate">{{ selectedEmployee?.fullName }}</div>
          <div class="font-sans text-sm text-muted-foreground">
            {{ selectedEmployee?.employeeCode }} · {{ selectedEmployee?.positionName || '—' }} · {{ selectedEmployee?.departmentName || '—' }}
          </div>
        </div>
        <ATag v-if="hasExisting" color="green">Đã cấu hình</ATag>
        <ATag v-else color="orange">Chưa cấu hình</ATag>
      </div>

      <div v-if="loadingConfig" class="py-12 text-center text-muted-foreground font-sans text-sm">Đang tải cấu hình…</div>

      <template v-else>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          <!-- Thu nhập -->
          <div class="space-y-4">
            <h4 class="font-mono text-[11px] uppercase tracking-widest text-emerald-600 border-b border-emerald-100 pb-1">Thu nhập</h4>
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Lương cơ bản</label>
              <AInputNumber v-model:value="form.baseSalary" :min="0" :step="100000" :formatter="formatter" :parser="parser" style="width: 100%" size="large" addon-after="₫" />
            </div>
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Phụ cấp ăn</label>
              <AInputNumber v-model:value="form.mealAllowance" :min="0" :step="50000" :formatter="formatter" :parser="parser" style="width: 100%" size="large" addon-after="₫" />
            </div>
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Phụ cấp xe</label>
              <AInputNumber v-model:value="form.transportAllowance" :min="0" :step="50000" :formatter="formatter" :parser="parser" style="width: 100%" size="large" addon-after="₫" />
            </div>
          </div>
          <!-- Khấu trừ -->
          <div class="space-y-4">
            <h4 class="font-mono text-[11px] uppercase tracking-widest text-red-600 border-b border-red-100 pb-1">Khấu trừ</h4>
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Khấu trừ bảo hiểm</label>
              <AInputNumber v-model:value="form.insuranceDeduction" :min="0" :step="50000" :formatter="formatter" :parser="parser" style="width: 100%" size="large" addon-after="₫" />
            </div>
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Khấu trừ khác</label>
              <AInputNumber v-model:value="form.otherDeductions" :min="0" :step="50000" :formatter="formatter" :parser="parser" style="width: 100%" size="large" addon-after="₫" />
            </div>
          </div>
        </div>

        <!-- Bảng phân tích thực lãnh -->
        <div class="rounded-xl border p-5 space-y-3" :class="invalidConfig ? 'bg-red-50 border-red-200' : 'bg-accent/5 border-accent/20'">
          <div class="flex items-center justify-between text-sm font-sans">
            <span class="text-muted-foreground">Tổng thu nhập</span>
            <span class="font-mono text-emerald-600">{{ vnd(totalIncome) }}</span>
          </div>
          <div class="flex items-center justify-between text-sm font-sans">
            <span class="text-muted-foreground">Tổng khấu trừ</span>
            <span class="font-mono text-red-600">− {{ vnd(totalDeduction) }}</span>
          </div>
          <!-- thanh tỷ lệ khấu trừ / thu nhập -->
          <div class="h-2 rounded-full bg-muted overflow-hidden">
            <div class="h-full rounded-full transition-all" :class="invalidConfig ? 'bg-red-500' : 'bg-accent'" :style="{ width: deductionPercent + '%' }"></div>
          </div>
          <div class="flex items-center justify-between border-t border-border/60 pt-3">
            <span class="font-mono text-xs uppercase tracking-widest text-muted-foreground">Thực lãnh (dự kiến)</span>
            <span class="font-display text-2xl" :class="invalidConfig ? 'text-red-600' : 'text-accent'">{{ vnd(netSalary) }}</span>
          </div>
        </div>

        <div v-if="invalidConfig" class="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-sans">
          Tổng khấu trừ đang vượt quá tổng thu nhập → thực lãnh âm. Hãy điều chỉnh lại trước khi lưu.
        </div>

        <div class="pt-1 flex justify-end gap-3 border-t border-border mt-2">
          <Button variant="ghost" type="button" @click="configModalOpen = false">Hủy</Button>
          <Button @click="save" :disabled="store.isLoading || invalidConfig" class="min-w-[160px]">
            <SaveIcon class="w-4 h-4 mr-2" />
            {{ store.isLoading ? 'Đang lưu...' : 'Lưu cấu hình' }}
          </Button>
        </div>
      </template>
    </div>
  </Modal>
</template>
