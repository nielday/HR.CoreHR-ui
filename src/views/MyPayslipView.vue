<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Select as ASelect, Table as ATable, Tag as ATag } from 'ant-design-vue'
import { BanknoteIcon, WalletIcon, TrendingUpIcon, TrendingDownIcon, PrinterIcon } from 'lucide-vue-next'
import { usePayrollStore, type PayrollRecord } from '../stores/payroll'
import { useEmployeeStore } from '../stores/employee'
import PayslipModal from '../components/PayslipModal.vue'

const store = usePayrollStore()
const empStore = useEmployeeStore()

const now = new Date()
const month = ref<number>(now.getMonth() + 1)
const year = ref<number>(now.getFullYear())

const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
const years = Array.from({ length: 6 }, (_, i) => ({ value: now.getFullYear() - 3 + i, label: `${now.getFullYear() - 3 + i}` }))

const myEmployeeId = ref<string | null>(null)
const notLinked = ref(false)

const vnd = (n: number) => (n ?? 0).toLocaleString('vi-VN') + ' ₫'

const STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Chờ duyệt', color: 'orange' },
  1: { label: 'Đã duyệt', color: 'blue' },
  2: { label: 'Đã chi trả', color: 'green' },
}

// Bảng lương của kỳ đang chọn (thường chỉ 1 bản ghi)
const current = ref<PayrollRecord | null>(null)
const myProfile = ref<any | null>(null)

// In phiếu lương
const printOpen = ref(false)
const printRecord = ref<any | null>(null)
function openPrint(record: any) {
  printRecord.value = record
  printOpen.value = true
}

const columns = [
  { title: 'Lương tháng', key: 'period', align: 'center' as const, width: 110 },
  { title: 'Lương cơ bản', key: 'baseSalary', align: 'right' as const },
  { title: 'Phụ cấp', key: 'totalAllowances', align: 'right' as const },
  { title: 'Khấu trừ', key: 'totalDeductions', align: 'right' as const },
  { title: 'Thực lãnh', key: 'netSalary', align: 'right' as const },
  { title: 'Trạng thái', key: 'status', align: 'center' as const, width: 120 },
  { title: '', key: 'actions', align: 'center' as const, width: 70 },
]

async function load() {
  if (!myEmployeeId.value) return
  await store.fetchPayrolls(month.value, year.value, myEmployeeId.value)
  current.value = store.payrolls[0] ?? null
}

onMounted(async () => {
  const me = await empStore.fetchMyProfile()
  if (me?.id) {
    myEmployeeId.value = me.id
    myProfile.value = me
    await load()
  } else {
    notLinked.value = true
  }
})

watch([month, year], load)
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Bảng lương của tôi</h1>
        <p class="text-muted-foreground font-sans text-lg">Xem chi tiết lương theo từng tháng của bạn.</p>
      </div>
      <div class="flex items-center gap-3">
        <ASelect v-model:value="month" :options="months" style="width: 120px" size="large" />
        <ASelect v-model:value="year" :options="years" style="width: 110px" size="large" />
      </div>
    </div>

    <div v-if="notLinked" class="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-sans">
      Tài khoản của bạn chưa được gắn với hồ sơ nhân viên nên chưa có dữ liệu lương.
    </div>
    <div v-else-if="store.error" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">{{ store.error }}</div>

    <template v-if="!notLinked">
      <!-- Tóm tắt tháng đang chọn -->
      <div v-if="current" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-card border border-border rounded-2xl shadow-sm p-5 flex items-start gap-4 md:col-span-1">
          <div class="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <WalletIcon class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <p class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Thực lãnh tháng {{ current.month }}/{{ current.year }}</p>
            <p class="font-display text-2xl text-accent">{{ vnd(current.netSalary) }}</p>
            <ATag class="mt-2" :color="STATUS[current.status]?.color">{{ STATUS[current.status]?.label || current.status }}</ATag>
          </div>
        </div>
        <div class="bg-card border border-border rounded-2xl shadow-sm p-5 flex items-start gap-4">
          <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUpIcon class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <p class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Lương cơ bản + Phụ cấp</p>
            <p class="font-display text-xl text-foreground">{{ vnd(current.baseSalary + current.totalAllowances) }}</p>
            <p class="text-xs text-muted-foreground font-sans mt-1">Phụ cấp: {{ vnd(current.totalAllowances) }}</p>
          </div>
        </div>
        <div class="bg-card border border-border rounded-2xl shadow-sm p-5 flex items-start gap-4">
          <div class="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <TrendingDownIcon class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <p class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Khấu trừ</p>
            <p class="font-display text-xl text-foreground">{{ vnd(current.totalDeductions) }}</p>
            <p class="text-xs text-muted-foreground font-sans mt-1">Bảo hiểm & các khoản khác</p>
          </div>
        </div>
      </div>

      <!-- Số liệu chấm công dùng để tính -->
      <div v-if="current" class="bg-card border border-border rounded-2xl shadow-sm p-6">
        <p class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-4">Cơ sở tính lương (chấm công)</p>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div><p class="text-xs text-muted-foreground font-sans">Công chuẩn</p><p class="font-mono text-lg text-foreground">{{ current.standardWorkdays }}</p></div>
          <div><p class="text-xs text-muted-foreground font-sans">Công thực tế</p><p class="font-mono text-lg text-foreground">{{ current.actualWorkdays }}</p></div>
          <div><p class="text-xs text-muted-foreground font-sans">Giờ tăng ca</p><p class="font-mono text-lg text-foreground">{{ current.overtimeHours }}</p></div>
          <div><p class="text-xs text-muted-foreground font-sans">Phép có lương</p><p class="font-mono text-lg text-emerald-600">{{ current.paidLeaveDays }}</p></div>
          <div><p class="text-xs text-muted-foreground font-sans">Phép không lương</p><p class="font-mono text-lg text-red-600">{{ current.unpaidLeaveDays }}</p></div>
        </div>
      </div>

      <!-- Bảng (kỳ đang chọn) -->
      <div class="bg-card border border-border rounded-2xl shadow-md p-6">
        <ATable :columns="columns" :data-source="store.payrolls" :loading="store.isLoading" row-key="id" :pagination="false">
          <template #emptyText>
            <div class="py-8 text-center text-muted-foreground font-sans text-sm">
              <BanknoteIcon class="w-6 h-6 mx-auto mb-2 opacity-50" />
              Chưa có bảng lương cho tháng {{ month }}/{{ year }}.
            </div>
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'period'"><span class="font-mono text-sm">{{ record.month }}/{{ record.year }}</span></template>
            <template v-else-if="column.key === 'baseSalary'"><span class="font-mono text-sm">{{ vnd(record.baseSalary) }}</span></template>
            <template v-else-if="column.key === 'totalAllowances'"><span class="font-mono text-sm text-emerald-600">{{ vnd(record.totalAllowances) }}</span></template>
            <template v-else-if="column.key === 'totalDeductions'"><span class="font-mono text-sm text-red-600">{{ vnd(record.totalDeductions) }}</span></template>
            <template v-else-if="column.key === 'netSalary'"><span class="font-mono text-sm font-semibold text-accent">{{ vnd(record.netSalary) }}</span></template>
            <template v-else-if="column.key === 'status'">
              <ATag :color="STATUS[record.status]?.color">{{ STATUS[record.status]?.label || record.status }}</ATag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <button @click="openPrint(record)" class="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-all" title="In phiếu lương">
                <PrinterIcon class="w-4 h-4" />
              </button>
            </template>
          </template>
        </ATable>
      </div>
    </template>

    <PayslipModal :open="printOpen" :payroll="printRecord" :employee="myProfile" @close="printOpen = false" />
  </div>
</template>
