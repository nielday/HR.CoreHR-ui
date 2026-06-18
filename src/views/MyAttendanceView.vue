<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Calendar as ACalendar, ConfigProvider as AConfigProvider, Tag as ATag, message } from 'ant-design-vue'
import viVN from 'ant-design-vue/es/locale/vi_VN'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/vi'
import { LogInIcon, LogOutIcon } from 'lucide-vue-next'
import { useAttendanceStore, ATTENDANCE_STATUS } from '../stores/attendance'
import Button from '../components/ui/Button.vue'

dayjs.locale('vi')

const store = useAttendanceStore()

// Tháng đang xem trên lịch
const current = ref<Dayjs>(dayjs())

// Map ngày 'YYYY-MM-DD' -> bản ghi chấm công
const recordMap = computed<Record<string, any>>(() => {
  const m: Record<string, any> = {}
  for (const r of store.myAttendance as any[]) {
    if (r.workDate) m[String(r.workDate).slice(0, 10)] = r
  }
  return m
})

const fmtTime = (s?: string | null) => {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

async function reload() {
  await store.fetchMine(current.value.month() + 1, current.value.year())
}

function onPanelChange(value: any) {
  current.value = dayjs(value)
  reload()
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

// Màu nền nhạt cho ô theo trạng thái
const cellBg: Record<number, string> = {
  0: 'bg-emerald-50 border-emerald-200',
  1: 'bg-red-50 border-red-200',
  2: 'bg-blue-50 border-blue-200',
  3: 'bg-purple-50 border-purple-200',
}

const recOf = (day: Dayjs) => recordMap.value[day.format('YYYY-MM-DD')]

// Ô có nền theo trạng thái; nếu đi muộn → viền vàng nổi bật
function cellClass(rec: any) {
  const base = cellBg[rec.status] || 'bg-muted border-border'
  return (rec.lateMinutes || 0) > 0 ? `${base} ring-2 ring-amber-400` : base
}

onMounted(reload)
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Chấm công của tôi</h1>
        <p class="text-muted-foreground font-sans text-lg">Lịch chấm công theo tháng — vào ca / tan ca mỗi ngày.</p>
      </div>
      <div class="flex items-center gap-3">
        <Button @click="doCheckIn" :disabled="store.isLoading" class="shadow-accent">
          <LogInIcon class="w-4 h-4 mr-2" /> Chấm công vào
        </Button>
        <button @click="doCheckOut" :disabled="store.isLoading"
          class="h-12 px-6 rounded-xl font-sans font-medium text-white shadow-sm hover:-translate-y-0.5 transition-all bg-gradient-to-r from-rose-500 to-orange-500 disabled:opacity-50 inline-flex items-center">
          <LogOutIcon class="w-4 h-4 mr-2" /> Tan ca
        </button>
      </div>
    </div>

    <div v-if="store.error" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">{{ store.error }}</div>

    <!-- Chú thích trạng thái -->
    <div class="flex flex-wrap items-center gap-3 text-sm font-sans">
      <span class="text-muted-foreground font-mono text-xs uppercase tracking-widest">Chú thích:</span>
      <ATag v-for="(s, k) in ATTENDANCE_STATUS" :key="k" :color="s.color">{{ s.label }}</ATag>
      <ATag color="warning">Đi muộn</ATag>
    </div>

    <!-- Lịch -->
    <div class="bg-card border border-border rounded-2xl shadow-md p-4 sm:p-6">
      <AConfigProvider :locale="viVN">
        <ACalendar v-model:value="current" @panelChange="onPanelChange">
          <template #dateCellRender="{ current: day }">
            <div v-if="recOf(day)" class="rounded-lg border px-1.5 py-1 text-[11px] leading-tight"
              :class="cellClass(recOf(day))">
              <div class="flex flex-wrap items-center gap-1 mb-1">
                <ATag :color="ATTENDANCE_STATUS[recOf(day).status]?.color" class="!mr-0">
                  {{ ATTENDANCE_STATUS[recOf(day).status]?.label }}
                </ATag>
                <ATag v-if="recOf(day).lateMinutes > 0" color="warning" class="!mr-0">Đi muộn</ATag>
              </div>
              <div class="font-mono text-foreground/80">
                <div>Vào: {{ fmtTime(recOf(day).checkInTime) }}</div>
                <div>Ra: {{ fmtTime(recOf(day).checkOutTime) }}</div>
                <div v-if="recOf(day).lateMinutes > 0" class="text-amber-600 font-semibold">Muộn: {{ recOf(day).lateMinutes }} phút</div>
                <div v-if="recOf(day).earlyLeaveMinutes > 0" class="text-orange-600">Về sớm: {{ recOf(day).earlyLeaveMinutes }} phút</div>
                <div v-if="recOf(day).overtimeHours > 0" class="text-emerald-600">TC: {{ recOf(day).overtimeHours }}h</div>
              </div>
            </div>
          </template>
        </ACalendar>
      </AConfigProvider>
    </div>
  </div>
</template>
