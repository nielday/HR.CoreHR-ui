<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Select as ASelect, SelectOption as ASelectOption, Tag as ATag, Tooltip as ATooltip, message } from 'ant-design-vue'
import { LogInIcon, LogOutIcon } from 'lucide-vue-next'
import { useAttendanceStore, ATTENDANCE_STATUS } from '../stores/attendance'
import DataTableShell from '../components/ui/DataTableShell.vue'
import Button from '../components/ui/Button.vue'

const store = useAttendanceStore()

const now = new Date()
const month = ref<number>(now.getMonth() + 1) // 1..12
const year = ref<number>(now.getFullYear())

const months = Array.from({ length: 12 }, (_, i) => i + 1)
const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 4 + i)

// Map ngày-trong-tháng (1..31) -> bản ghi. Dùng slice(8,10) để tránh lệch múi giờ.
const recordByDay = computed<Record<number, any>>(() => {
  const m: Record<number, any> = {}
  for (const r of store.myAttendance as any[]) {
    if (r.workDate) {
      const d = Number(String(r.workDate).slice(8, 10))
      if (d >= 1 && d <= 31) m[d] = r
    }
  }
  return m
})

// ===== Thống kê =====
const stats = computed(() => {
  const recs = store.myAttendance as any[]
  let workdays = 0
  let workedHours = 0
  let overtimeHours = 0
  let lateCount = 0
  for (const r of recs) {
    if (r.status === 0) workdays++
    workedHours += Number(r.workedHours) || 0
    overtimeHours += Number(r.overtimeHours) || 0
    if ((Number(r.lateMinutes) || 0) > 0) lateCount++
  }
  return { workdays, workedHours, overtimeHours, lateCount }
})

const round1 = (n: number) => Math.round(n * 10) / 10

// ===== Lưới lịch (T2..CN) =====
interface Cell {
  day: number | null
  isWeekend: boolean
  isToday: boolean
}

const calendarCells = computed<Cell[]>(() => {
  const y = year.value
  const m = month.value // 1..12
  const first = new Date(y, m - 1, 1)
  // JS: 0=CN..6=T7. Chuyển sang T2=0..CN=6
  const lead = (first.getDay() + 6) % 7
  const daysInMonth = new Date(y, m, 0).getDate()
  const cells: Cell[] = []
  for (let i = 0; i < lead; i++) cells.push({ day: null, isWeekend: false, isToday: false })
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = (new Date(y, m - 1, d).getDay() + 6) % 7 // T2=0..CN=6
    const isWeekend = dow >= 5
    const isToday = d === now.getDate() && m === now.getMonth() + 1 && y === now.getFullYear()
    cells.push({ day: d, isWeekend, isToday })
  }
  // bù cuối hàng cho đủ bội số 7
  while (cells.length % 7 !== 0) cells.push({ day: null, isWeekend: false, isToday: false })
  return cells
})

const weekdayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

const fmtTime = (s?: string | null) => {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

const recOf = (day: number | null) => (day == null ? undefined : recordByDay.value[day])

// Màu nền nhạt theo trạng thái
const cellBg: Record<number, string> = {
  0: 'bg-emerald-50 border-emerald-200',
  1: 'bg-red-50 border-red-200',
  2: 'bg-blue-50 border-blue-200',
  3: 'bg-purple-50 border-purple-200',
}

function cellClass(cell: Cell): string {
  const rec = recOf(cell.day)
  const parts: string[] = []
  if (rec) {
    parts.push(cellBg[rec.status] || 'bg-muted border-border')
    if ((Number(rec.lateMinutes) || 0) > 0) parts.push('ring-2 ring-amber-400')
  } else if (cell.isWeekend) {
    parts.push('bg-muted/60 border-border')
  } else {
    parts.push('bg-card border-border')
  }
  if (cell.isToday) parts.push('ring-2 ring-accent ring-offset-1')
  return parts.join(' ')
}

function tooltipText(rec: any): string {
  const st = ATTENDANCE_STATUS[rec.status]?.label || 'Không rõ'
  return `Trạng thái: ${st}\nVào: ${fmtTime(rec.checkInTime)} — Ra: ${fmtTime(rec.checkOutTime)}`
}

async function reload() {
  await store.fetchMine(month.value, year.value)
}

async function doCheckIn() {
  const ok = await store.checkIn()
  ok ? message.success('Đã chấm công vào') : message.error(store.error || 'Chấm công vào thất bại')
  await reload()
}
async function doCheckOut() {
  const ok = await store.checkOut()
  ok ? message.success('Đã chấm công ra') : message.error(store.error || 'Chấm công ra thất bại')
  await reload()
}

watch([month, year], reload)
onMounted(reload)
</script>

<template>
  <DataTableShell
    title="Chấm công của tôi"
    subtitle="Lịch chấm công theo tháng — vào ca / tan ca mỗi ngày."
  >
    <template #actions>
      <Button @click="doCheckIn" :disabled="store.isLoading" class="shadow-accent">
        <LogInIcon class="w-4 h-4 mr-2" /> Chấm công vào
      </Button>
      <button
        @click="doCheckOut"
        :disabled="store.isLoading"
        class="h-12 px-6 rounded-xl font-sans font-medium text-white shadow-sm hover:-translate-y-0.5 transition-all bg-gradient-to-r from-rose-500 to-orange-500 disabled:opacity-50 inline-flex items-center"
      >
        <LogOutIcon class="w-4 h-4 mr-2" /> Tan ca
      </button>
    </template>

    <template #filters>
      <ASelect v-model:value="month" style="width: 120px">
        <ASelectOption v-for="m in months" :key="m" :value="m">Tháng {{ m }}</ASelectOption>
      </ASelect>
      <ASelect v-model:value="year" style="width: 110px">
        <ASelectOption v-for="y in years" :key="y" :value="y">{{ y }}</ASelectOption>
      </ASelect>
      <div class="flex flex-wrap items-center gap-2 ml-auto">
        <span class="text-muted-foreground font-mono text-xs uppercase tracking-widest">Chú thích:</span>
        <ATag v-for="(s, k) in ATTENDANCE_STATUS" :key="k" :color="s.color">{{ s.label }}</ATag>
        <ATag color="warning">Đi muộn</ATag>
      </div>
    </template>

    <template #banner>
      <div v-if="store.error" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
        {{ store.error }}
      </div>
    </template>

    <!-- Khối thống kê -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-card border border-border rounded-xl shadow-sm p-4">
        <div class="font-mono text-xs uppercase tracking-widest text-muted-foreground">Ngày công</div>
        <div class="font-display text-2xl text-foreground mt-1">{{ stats.workdays }}</div>
      </div>
      <div class="bg-card border border-border rounded-xl shadow-sm p-4">
        <div class="font-mono text-xs uppercase tracking-widest text-muted-foreground">Tổng giờ làm</div>
        <div class="font-display text-2xl text-foreground mt-1">{{ round1(stats.workedHours) }}h</div>
      </div>
      <div class="bg-card border border-border rounded-xl shadow-sm p-4">
        <div class="font-mono text-xs uppercase tracking-widest text-muted-foreground">Tăng ca</div>
        <div class="font-display text-2xl text-emerald-600 mt-1">{{ round1(stats.overtimeHours) }}h</div>
      </div>
      <div class="bg-card border border-border rounded-xl shadow-sm p-4">
        <div class="font-mono text-xs uppercase tracking-widest text-muted-foreground">Số lần đi muộn</div>
        <div class="font-display text-2xl mt-1" :class="stats.lateCount > 0 ? 'text-amber-600' : 'text-foreground'">{{ stats.lateCount }}</div>
      </div>
    </div>

    <!-- Lịch tháng -->
    <div class="bg-card border border-border rounded-2xl shadow-md p-4 sm:p-6">
      <div class="grid grid-cols-7 gap-2 mb-2">
        <div
          v-for="(w, i) in weekdayLabels"
          :key="w"
          class="text-center font-mono text-xs uppercase tracking-widest py-1"
          :class="i >= 5 ? 'text-rose-500' : 'text-muted-foreground'"
        >
          {{ w }}
        </div>
      </div>
      <div class="grid grid-cols-7 gap-2">
        <template v-for="(cell, idx) in calendarCells" :key="idx">
          <div v-if="cell.day == null" class="min-h-[72px] sm:min-h-[88px]"></div>
          <ATooltip v-else :title="recOf(cell.day) ? tooltipText(recOf(cell.day)) : undefined">
            <div
              class="min-h-[72px] sm:min-h-[88px] rounded-xl border p-2 flex flex-col transition-colors"
              :class="cellClass(cell)"
            >
              <div class="flex items-center justify-between">
                <span
                  class="font-display text-sm leading-none"
                  :class="cell.isToday ? 'text-accent font-bold' : 'text-foreground'"
                >
                  {{ cell.day }}
                </span>
                <ATag
                  v-if="recOf(cell.day)"
                  :color="ATTENDANCE_STATUS[recOf(cell.day).status]?.color"
                  class="!mr-0 !text-[10px] !leading-tight"
                >
                  {{ ATTENDANCE_STATUS[recOf(cell.day).status]?.label }}
                </ATag>
              </div>
              <div v-if="recOf(cell.day)" class="mt-auto pt-1 font-mono text-[11px] text-foreground/70">
                <div v-if="(recOf(cell.day).workedHours || 0) > 0">{{ round1(recOf(cell.day).workedHours) }}h</div>
                <div v-if="(recOf(cell.day).lateMinutes || 0) > 0" class="text-amber-600 font-semibold">Muộn {{ recOf(cell.day).lateMinutes }}'</div>
                <div v-if="(recOf(cell.day).overtimeHours || 0) > 0" class="text-emerald-600">TC {{ round1(recOf(cell.day).overtimeHours) }}h</div>
              </div>
            </div>
          </ATooltip>
        </template>
      </div>
    </div>
  </DataTableShell>
</template>
