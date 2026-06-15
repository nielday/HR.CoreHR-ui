<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Select as ASelect, InputNumber as AInputNumber, message } from 'ant-design-vue'
import { SaveIcon, UserIcon } from 'lucide-vue-next'
import { usePayrollStore } from '../stores/payroll'
import { useEmployeeStore } from '../stores/employee'
import Button from '../components/ui/Button.vue'

const store = usePayrollStore()
const empStore = useEmployeeStore()

const selectedEmployeeId = ref<string | undefined>(undefined)
const loadingConfig = ref(false)
const hasExisting = ref(false)

const form = ref({
  baseSalary: 0,
  mealAllowance: 0,
  transportAllowance: 0,
  insuranceDeduction: 0,
  otherDeductions: 0,
})

const employeeOptions = computed(() =>
  (empStore.employees as any[]).map(e => ({ value: e.id, label: `${e.fullName} (${e.employeeCode})` }))
)

const netSalary = computed(() =>
  form.value.baseSalary + form.value.mealAllowance + form.value.transportAllowance
  - form.value.insuranceDeduction - form.value.otherDeductions
)

const vnd = (n: number) => (n ?? 0).toLocaleString('vi-VN') + ' ₫'
const parser = (v: string) => v.replace(/[^\d]/g, '')
const formatter = (v: string | number | undefined) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

async function onSelectEmployee(value: any) {
  const id = value as string
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

onMounted(() => { if (!empStore.employees.length) empStore.fetchEmployees({ pageSize: 1000 }) })
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <div>
      <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Cấu hình lương</h1>
      <p class="text-muted-foreground font-sans text-lg">Thiết lập lương cơ bản, phụ cấp và khấu trừ cho từng nhân viên.</p>
    </div>

    <div class="bg-card border border-border rounded-2xl shadow-md p-6 max-w-2xl">
      <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Nhân viên</label>
      <ASelect
        :value="selectedEmployeeId"
        :options="employeeOptions"
        show-search
        :filter-option="(input: string, opt: any) => opt.label.toLowerCase().includes(input.toLowerCase())"
        placeholder="Tìm và chọn nhân viên..."
        style="width: 100%"
        size="large"
        @change="onSelectEmployee"
      />

      <div v-if="selectedEmployeeId" class="mt-6 space-y-5">
        <div v-if="!hasExisting" class="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-sans">
          Nhân viên này chưa có cấu hình lương — nhập và lưu để tạo mới.
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Khấu trừ bảo hiểm</label>
            <AInputNumber v-model:value="form.insuranceDeduction" :min="0" :step="50000" :formatter="formatter" :parser="parser" style="width: 100%" size="large" addon-after="₫" />
          </div>
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Khấu trừ khác</label>
            <AInputNumber v-model:value="form.otherDeductions" :min="0" :step="50000" :formatter="formatter" :parser="parser" style="width: 100%" size="large" addon-after="₫" />
          </div>
        </div>

        <!-- Net preview -->
        <div class="flex items-center justify-between p-4 rounded-xl bg-accent/5 border border-accent/20">
          <span class="font-mono text-xs uppercase tracking-widest text-muted-foreground">Thực lãnh (dự kiến)</span>
          <span class="font-display text-2xl text-accent">{{ vnd(netSalary) }}</span>
        </div>

        <div class="pt-2 flex justify-end">
          <Button @click="save" :disabled="store.isLoading" class="min-w-[160px]">
            <SaveIcon class="w-4 h-4 mr-2" />
            {{ store.isLoading ? 'Đang lưu...' : 'Lưu cấu hình' }}
          </Button>
        </div>
      </div>

      <div v-else class="mt-8 flex flex-col items-center justify-center py-10 text-muted-foreground">
        <UserIcon class="w-10 h-10 mb-3 opacity-40" />
        <p class="font-sans text-sm">Chọn một nhân viên để xem / chỉnh cấu hình lương.</p>
      </div>
    </div>
  </div>
</template>
