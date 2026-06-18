<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { InputNumber as AInputNumber, Tag as ATag, message } from 'ant-design-vue'
import { SaveIcon, UserIcon } from 'lucide-vue-next'
import { usePayrollStore } from '../stores/payroll'
import { useEmployeeStore } from '../stores/employee'
import Button from '../components/ui/Button.vue'

const store = usePayrollStore()
const empStore = useEmployeeStore()

const selectedEmployeeId = ref<string | undefined>(undefined)
const loadingConfig = ref(false)
const hasExisting = ref(false)
const search = ref('')

const form = ref({
  baseSalary: 0,
  mealAllowance: 0,
  transportAllowance: 0,
  insuranceDeduction: 0,
  otherDeductions: 0,
})

// Danh sách NV (bỏ người đã nghỉ), lọc theo tìm kiếm, nhóm theo phòng ban
const employeeGroups = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = (empStore.allEmployees as any[]).filter((e) => {
    if (e.workingStatus === 'Resigned') return false
    if (q && !`${e.fullName} ${e.employeeCode}`.toLowerCase().includes(q)) return false
    return true
  })
  const m = new Map<string, any[]>()
  for (const e of list) {
    const dept = e.departmentName || 'Chưa phân phòng'
    if (!m.has(dept)) m.set(dept, [])
    m.get(dept)!.push(e)
  }
  return [...m.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'vi'))
    .map(([dept, employees]) => ({
      dept,
      employees: employees.sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi')),
    }))
})
const totalCount = computed(() => employeeGroups.value.reduce((s, g) => s + g.employees.length, 0))
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

async function selectEmployee(id: string) {
  selectedEmployeeId.value = id
  loadingConfig.value = true
  const cfg = await store.fetchSalaryConfig(id)
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
  if (res) { message.success('Đã lưu cấu hình lương'); hasExisting.value = true }
  else message.error(store.error || 'Lưu thất bại')
}

onMounted(() => { if (!empStore.allEmployees.length) empStore.fetchAllEmployees() })
</script>

<template>
  <div class="space-y-6 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <div>
      <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Cấu hình lương</h1>
      <p class="text-muted-foreground font-sans text-lg">Thiết lập lương cơ bản, phụ cấp và khấu trừ cho từng nhân viên.</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <!-- ===== TRÁI: danh sách nhân viên ===== -->
      <div class="lg:col-span-1 bg-card border border-border rounded-2xl shadow-md flex flex-col overflow-hidden" style="max-height: calc(100vh - 220px)">
        <div class="p-3 border-b border-border">
          <input
            v-model="search"
            type="text"
            placeholder="Tìm nhân viên..."
            class="w-full h-10 px-3 rounded-lg border border-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-accent font-sans"
          />
          <div class="mt-1.5 font-mono text-[11px] text-muted-foreground">{{ totalCount }} nhân viên</div>
        </div>
        <div class="flex-1 overflow-y-auto p-2">
          <template v-for="g in employeeGroups" :key="g.dept">
            <div class="px-2 pt-3 pb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{{ g.dept }}</div>
            <button
              v-for="e in g.employees"
              :key="e.id"
              type="button"
              @click="selectEmployee(e.id)"
              class="w-full text-left px-3 py-2 rounded-lg transition-colors mb-0.5"
              :class="selectedEmployeeId === e.id ? 'bg-accent/10 text-accent ring-1 ring-accent/20' : 'hover:bg-muted text-foreground'"
            >
              <span class="block font-sans text-sm font-medium truncate">{{ e.fullName }}</span>
              <span class="block font-mono text-[11px] text-muted-foreground">{{ e.employeeCode }} · {{ e.positionName || '—' }}</span>
            </button>
          </template>
          <div v-if="!employeeGroups.length" class="p-6 text-center text-sm text-muted-foreground font-sans">
            Không tìm thấy nhân viên.
          </div>
        </div>
      </div>

      <!-- ===== PHẢI: cấu hình của nhân viên đang chọn ===== -->
      <div class="lg:col-span-2">
        <div v-if="selectedEmployeeId" class="bg-card border border-border rounded-2xl shadow-md p-6 space-y-6">
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

            <div class="pt-1 flex justify-end">
              <Button @click="save" :disabled="store.isLoading || invalidConfig" class="min-w-[160px]">
                <SaveIcon class="w-4 h-4 mr-2" />
                {{ store.isLoading ? 'Đang lưu...' : 'Lưu cấu hình' }}
              </Button>
            </div>
          </template>
        </div>

        <!-- Chưa chọn NV -->
        <div v-else class="bg-card border border-border rounded-2xl shadow-md flex flex-col items-center justify-center text-muted-foreground" style="min-height: 360px">
          <UserIcon class="w-12 h-12 mb-3 opacity-40" />
          <p class="font-sans text-sm">Chọn một nhân viên ở danh sách bên trái để xem / chỉnh cấu hình lương.</p>
        </div>
      </div>
    </div>
  </div>
</template>
